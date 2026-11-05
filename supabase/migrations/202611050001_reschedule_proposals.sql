begin;

alter table public.appointments add column reschedule_proposal jsonb;
alter table public.notification_outbox add column read_at timestamptz;

create policy notification_inbox_read on public.notification_outbox for select to authenticated
  using (user_id = (select auth.uid()));
create policy notification_inbox_mark_read on public.notification_outbox for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select (id, user_id, appointment_id, title, body, created_at, read_at) on public.notification_outbox to authenticated;
grant update (read_at) on public.notification_outbox to authenticated;

create function public.clear_inactive_reschedule() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status not in ('pending', 'confirmed') or new.starts_at <> old.starts_at then
    new.reschedule_proposal := null;
  end if;
  return new;
end $$;
create trigger clear_inactive_reschedule before update on public.appointments
  for each row execute function public.clear_inactive_reschedule();

create or replace function public.reschedule_appointment(p_id uuid, p_starts_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  appointment public.appointments;
  barber public.barbers;
  slot record;
  expires_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Intră în cont.'; end if;
  perform pg_advisory_xact_lock(20261104);
  select * into appointment from public.appointments where id = p_id for update;
  if not found then raise exception 'Acces refuzat.'; end if;
  select * into barber from public.barbers where id = appointment.barber_id;
  if auth.uid() is distinct from barber.owner_id and auth.uid() is distinct from appointment.client_id then
    raise exception 'Acces refuzat.';
  end if;
  if appointment.status not in ('pending', 'confirmed') or appointment.starts_at <= clock_timestamp() then
    raise exception 'Programarea nu mai poate fi reprogramată.';
  end if;
  if auth.uid() is distinct from barber.owner_id and appointment.starts_at < clock_timestamp() + make_interval(hours => barber.cancellation_hours) then
    raise exception 'Contactează frizerul pentru reprogramare.';
  end if;
  if p_starts_at = appointment.starts_at then raise exception 'Alege o oră diferită de cea actuală.'; end if;

  select * into slot from public.available_slots(appointment.service_id, (p_starts_at at time zone 'Europe/Bucharest')::date, p_id) s
    where s.starts_at = p_starts_at;
  if not found then raise exception 'slot_unavailable'; end if;

  if auth.uid() = barber.owner_id and appointment.client_id is not null then
    expires_at := least(appointment.starts_at, slot.starts_at - interval '15 minutes');
    if expires_at <= clock_timestamp() then
      raise exception 'Alege o oră care lasă timp pentru răspunsul clientului.';
    end if;
    update public.appointments set
      reschedule_proposal = jsonb_build_object('id', gen_random_uuid(), 'starts_at', slot.starts_at, 'expires_at', expires_at),
      updated_at = now()
      where id = p_id;
    insert into public.notification_outbox(user_id, appointment_id, title, body)
    values (appointment.client_id, p_id, 'Propunere de reprogramare', 'Frizerul propune o altă oră. Acceptă sau refuză din Programări.');
    return;
  end if;

  update public.appointments set starts_at = slot.starts_at, ends_at = slot.ends_at,
    status = case when auth.uid() = barber.owner_id or barber.auto_confirm then 'confirmed' else 'pending' end,
    updated_at = now()
    where id = p_id;
end $$;

create function public.respond_to_reschedule(p_id uuid, p_proposal_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  appointment public.appointments;
  barber_owner uuid;
  hours public.working_hours;
  proposed_start timestamptz;
  proposed_end timestamptz;
  local_start timestamp;
  local_end timestamp;
begin
  if auth.uid() is null then raise exception 'Intră în cont.'; end if;
  perform pg_advisory_xact_lock(20261104);
  select * into appointment from public.appointments where id = p_id for update;
  if not found or appointment.client_id is distinct from auth.uid() then
    raise exception 'Doar clientul programării poate răspunde.';
  end if;
  if p_accept is null or p_proposal_id is null or appointment.status not in ('pending', 'confirmed')
    or appointment.reschedule_proposal is null
    or (appointment.reschedule_proposal->>'id')::uuid <> p_proposal_id
    or (appointment.reschedule_proposal->>'expires_at')::timestamptz <= clock_timestamp() then
    raise exception 'Propunerea nu mai este valabilă. Verifică programarea actuală.';
  end if;

  if p_accept then
    proposed_start := (appointment.reschedule_proposal->>'starts_at')::timestamptz;
    proposed_end := proposed_start + (appointment.ends_at - appointment.starts_at);
    local_start := proposed_start at time zone 'Europe/Bucharest';
    local_end := proposed_end at time zone 'Europe/Bucharest';
    select * into hours from public.working_hours
      where barber_id = appointment.barber_id and weekday = extract(dow from local_start) and enabled;
    if not found or local_start < local_start::date + hours.opens or local_end > local_start::date + hours.closes
      or (hours.break_start is not null and local_start < local_start::date + hours.break_end and local_end > local_start::date + hours.break_start)
      or exists (select 1 from public.days_off where barber_id = appointment.barber_id and date = local_start::date)
      or exists (select 1 from public.appointments other where other.barber_id = appointment.barber_id and other.id <> p_id
        and other.status in ('pending', 'confirmed', 'completed') and other.starts_at < proposed_end and other.ends_at > proposed_start) then
      raise exception 'Ora propusă nu mai este disponibilă. Programarea actuală rămâne valabilă.';
    end if;
    update public.appointments set starts_at = proposed_start, ends_at = proposed_end, status = 'confirmed',
      reschedule_proposal = null, updated_at = now() where id = p_id;
  else
    update public.appointments set reschedule_proposal = null, updated_at = now() where id = p_id;
    select owner_id into barber_owner from public.barbers where id = appointment.barber_id;
    if barber_owner is not null then
      insert into public.notification_outbox(user_id, appointment_id, title, body)
      values (barber_owner, p_id, 'Reprogramare refuzată', 'Clientul a păstrat ora inițială.');
    end if;
  end if;
end $$;

create or replace function public.queue_appointment_notification() returns trigger language plpgsql security definer set search_path = '' as $$
declare owner uuid; message text; owner_title text := 'Atelier · Agenda ta';
begin
  if tg_op = 'UPDATE' and new.status = old.status and new.starts_at = old.starts_at then return new; end if;
  select owner_id into owner from public.barbers where id = new.barber_id;
  message := case when tg_op = 'INSERT' then 'O programare nouă a fost adăugată.'
    when new.status = 'cancelled' then 'O programare a fost anulată.' else 'O programare a fost actualizată.' end;
  if tg_op = 'UPDATE' and auth.uid() = new.client_id and new.starts_at <> old.starts_at
    and new.starts_at = (old.reschedule_proposal->>'starts_at')::timestamptz then
    owner_title := 'Reprogramare acceptată';
    message := 'Clientul a acceptat noua oră.';
  end if;
  if owner is not null and owner is distinct from auth.uid() then
    insert into public.notification_outbox(user_id, appointment_id, title, body) values(owner, new.id, owner_title, message);
  end if;
  if new.client_id is not null and new.client_id is distinct from auth.uid() then
    insert into public.notification_outbox(user_id, appointment_id, title, body) values(new.client_id, new.id, 'Atelier · Programarea ta', message);
  end if;
  return new;
end $$;

revoke all on function public.clear_inactive_reschedule(), public.respond_to_reschedule(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.respond_to_reschedule(uuid, uuid, boolean) to authenticated;

commit;
