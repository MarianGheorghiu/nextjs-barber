begin;

alter table public.appointments
  add column cancellation_reason text,
  add column cancelled_at timestamptz;

-- Compare the versions shown on screen under the same lock as the write.
-- Use a timestamp string that PostgREST and JavaScript both preserve to microseconds.
create function public.appointment_review_key(a public.appointments) returns text
language sql stable set search_path = '' as $$
  select a.id::text || '/' || to_char(a.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
$$;

create function public.touch_appointment() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    new.cancelled_at := new.updated_at;
    new.cancellation_reason := coalesce(new.cancellation_reason,
      case when public.is_barber() then 'Anulată de frizer' else 'Anulată de client' end);
  end if;
  return new;
end $$;
create trigger touch_appointment before update on public.appointments
  for each row execute function public.touch_appointment();

alter function public.book_appointment(uuid,timestamptz,text,text,text) rename to book_appointment_internal;
alter function public.change_appointment_status(uuid,text) rename to change_appointment_status_internal;
alter function public.reschedule_appointment(uuid,timestamptz) rename to reschedule_appointment_internal;
revoke execute on function public.book_appointment_internal(uuid,timestamptz,text,text,text),
  public.change_appointment_status_internal(uuid,text), public.reschedule_appointment_internal(uuid,timestamptz)
  from authenticated;

create function public.book_appointment(p_service_id uuid, p_starts_at timestamptz,
  p_manual_name text default null, p_manual_phone text default null, p_notes text default '',
  p_expected_service jsonb default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.services;
begin
  perform pg_advisory_xact_lock(20261104);
  if p_expected_service is not null then
    select * into s from public.services where id = p_service_id for share;
    if not found or p_expected_service is distinct from jsonb_build_array(s.id, s.name, s.duration_minutes, s.price_cents, s.active) then
      raise exception 'Serviciul s-a schimbat între timp. Verifică din nou prețul și durata.';
    end if;
  end if;
  return public.book_appointment_internal(p_service_id, p_starts_at, p_manual_name, p_manual_phone, p_notes);
end $$;

create function public.check_appointment_review(p_id uuid, p_expected text) returns void
language plpgsql set search_path = '' as $$
declare a public.appointments;
begin
  select * into a from public.appointments where id = p_id;
  if auth.uid() is null or not found or (a.client_id is distinct from auth.uid() and not public.is_barber()) then
    raise exception 'Acces refuzat.';
  end if;
  if p_expected is not null and p_expected is distinct from public.appointment_review_key(a) then
    raise exception 'Programarea s-a schimbat între timp. Verifică din nou detaliile.';
  end if;
end $$;

create function public.change_appointment_status(p_id uuid, p_status text, p_expected text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.appointments;
begin
  perform pg_advisory_xact_lock(20261104);
  perform public.check_appointment_review(p_id, p_expected);
  select * into a from public.appointments where id = p_id;
  if (not public.is_barber() and a.starts_at <= clock_timestamp())
    or (p_status = 'confirmed' and a.starts_at <= clock_timestamp()) then
    raise exception 'Programarea a început deja.';
  end if;
  perform public.change_appointment_status_internal(p_id, p_status);
end $$;

create function public.reschedule_appointment(p_id uuid, p_starts_at timestamptz, p_expected text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(20261104);
  perform public.check_appointment_review(p_id, p_expected);
  perform public.reschedule_appointment_internal(p_id, p_starts_at);
end $$;

-- The IDs and dates match HOLIDAY_RULES in src/lib/calendar.ts.
create table public.holiday_rules (
  id text primary key,
  name text not null,
  month_day text,
  easter_offset integer,
  check ((month_day is null) <> (easter_offset is null))
);
revoke all on public.holiday_rules from public, anon, authenticated;
insert into public.holiday_rules values
  ('new-year', 'Anul Nou', '01-01', null),
  ('new-year-2', 'A doua zi de Anul Nou', '01-02', null),
  ('epiphany', 'Boboteaza', '01-06', null),
  ('saint-john', 'Sfântul Ioan', '01-07', null),
  ('union', 'Unirea Principatelor', '01-24', null),
  ('good-friday', 'Vinerea Mare', null, -2),
  ('easter', 'Paștele ortodox', null, 0),
  ('easter-monday', 'A doua zi de Paște', null, 1),
  ('labour', '1 Mai', '05-01', null),
  ('children', 'Ziua Copilului', '06-01', null),
  ('pentecost', 'Rusaliile', null, 49),
  ('pentecost-monday', 'A doua zi de Rusalii', null, 50),
  ('assumption', 'Adormirea Maicii Domnului', '08-15', null),
  ('andrew', 'Sfântul Andrei', '11-30', null),
  ('national', 'Ziua Națională', '12-01', null),
  ('christmas', 'Crăciunul', '12-25', null),
  ('christmas-2', 'A doua zi de Crăciun', '12-26', null),
  ('three-hierarchs', 'Sfinții Trei Ierarhi', '01-30', null),
  ('meeting', 'Întâmpinarea Domnului', '02-02', null),
  ('annunciation', 'Buna Vestire', '03-25', null),
  ('palm-sunday', 'Floriile', null, -7),
  ('bright-friday', 'Izvorul Tămăduirii', null, 5),
  ('george', 'Sfântul Gheorghe', '04-23', null),
  ('ascension', 'Înălțarea Domnului', null, 39),
  ('constantine', 'Sfinții Constantin și Elena', '05-21', null),
  ('john-birth', 'Nașterea Sfântului Ioan Botezătorul', '06-24', null),
  ('peter-paul', 'Sfinții Petru și Pavel', '06-29', null),
  ('elijah', 'Sfântul Proroc Ilie', '07-20', null),
  ('transfiguration', 'Schimbarea la Față', '08-06', null),
  ('john-beheading', 'Tăierea Capului Sfântului Ioan Botezătorul', '08-29', null),
  ('mary-birth', 'Nașterea Maicii Domnului', '09-08', null),
  ('cross', 'Înălțarea Sfintei Cruci', '09-14', null),
  ('protection', 'Acoperământul Maicii Domnului', '10-01', null),
  ('paraskeva', 'Sfânta Cuvioasă Parascheva', '10-14', null),
  ('demetrius', 'Sfântul Dumitru', '10-26', null),
  ('demetrius-new', 'Sfântul Cuvios Dimitrie cel Nou', '10-27', null),
  ('archangels', 'Sfinții Mihail și Gavriil', '11-08', null),
  ('mary-entry', 'Intrarea Maicii Domnului în Biserică', '11-21', null),
  ('nicholas', 'Sfântul Nicolae', '12-06', null),
  ('stephen', 'Sfântul Ștefan', '12-27', null);

alter table public.barbers add column closed_holiday_ids text[] not null default '{}';
update public.barbers set closed_holiday_ids = array(select id from public.holiday_rules order by id);

create function public.orthodox_easter(y integer) returns date
language sql immutable set search_path = '' as $$
  with offsets as (select (19 * (y % 19) + 15) % 30 as d),
  julian as (select d + (2 * (y % 4) + 4 * (y % 7) - d + 34) % 7 + 114 as n from offsets)
  select make_date(y, n / 31, n % 31 + 1) + (y / 100 - y / 400 - 2) from julian;
$$;

create function public.holiday_reason(p_day date, p_ids text[]) returns text
language sql stable set search_path = '' as $$
  select string_agg(name, ' / ' order by id)
  from public.holiday_rules
  where id = any(p_ids) and case when month_day is not null
    then to_char(p_day, 'MM-DD') = month_day
    else p_day = public.orthodox_easter(extract(year from p_day)::integer) + easter_offset end;
$$;

-- Public calendar only needs closure dates. Keep the owner's reasons private.
create function public.calendar_days_off() returns setof public.days_off
language sql stable security definer set search_path = '' as $$
  select id, barber_id, date, case when public.is_barber() then reason else '' end
  from public.days_off order by date;
$$;

create or replace function public.available_slots(p_service_id uuid, p_date date, p_exclude_id uuid default null)
returns table(starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  s public.services;
  h public.working_hours;
  ignored public.appointments;
  opens_at timestamptz;
  closes_at timestamptz;
  duration interval;
begin
  if p_date < (now() at time zone 'Europe/Bucharest')::date or p_date > (now() at time zone 'Europe/Bucharest')::date + 60 then return; end if;
  select * into s from public.services where id = p_service_id;
  if not found then return; end if;
  duration := make_interval(mins => s.duration_minutes);

  if p_exclude_id is not null then
    select * into ignored from public.appointments where id = p_exclude_id and service_id = p_service_id
      and (client_id = auth.uid() or public.is_barber()) and status in ('pending','confirmed');
    if not found then raise exception 'Acces refuzat.'; end if;
    duration := ignored.ends_at - ignored.starts_at;
  elsif not s.active then
    return;
  end if;

  select * into h from public.working_hours where barber_id = s.barber_id and weekday = extract(dow from p_date) and enabled;
  if not found
    or exists(select 1 from public.days_off d where d.barber_id = s.barber_id and d.date = p_date)
    or exists(select 1 from public.barbers b where b.id = s.barber_id and public.holiday_reason(p_date, b.closed_holiday_ids) is not null)
  then return; end if;

  opens_at := (p_date + h.opens) at time zone 'Europe/Bucharest';
  closes_at := (p_date + h.closes) at time zone 'Europe/Bucharest';
  return query
    with blocks as (
      select greatest(a.starts_at, opens_at) as starts, least(a.ends_at, closes_at) as ends
      from public.appointments a
      where a.barber_id = s.barber_id and a.id is distinct from p_exclude_id and a.status in ('pending','confirmed','completed')
        and a.starts_at < closes_at and a.ends_at > opens_at
      union all
      select (p_date + h.break_start) at time zone 'Europe/Bucharest', (p_date + h.break_end) at time zone 'Europe/Bucharest'
      where h.break_start is not null
      union all select closes_at, closes_at
    ),
    free as (
      select coalesce(max(ends) over (order by starts, ends rows between unbounded preceding and 1 preceding), opens_at) as first_slot,
        starts as gap_end from blocks
    )
    select candidate.slot, candidate.slot + duration
    from free cross join lateral generate_series(first_slot, gap_end - duration, duration) as candidate(slot)
    where candidate.slot >= now() + interval '15 minutes' order by candidate.slot;
end $$;

create or replace function public.respond_to_reschedule(p_id uuid, p_proposal_id uuid, p_accept boolean)
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
      or exists (select 1 from public.barbers where id = appointment.barber_id
        and public.holiday_reason(local_start::date, closed_holiday_ids) is not null)
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

create function public.outside_working_hours(a public.appointments, h public.working_hours) returns boolean
language sql stable set search_path = '' as $$
  select not coalesce(h.enabled, false)
    or (a.starts_at at time zone 'Europe/Bucharest')::time < h.opens
    or (a.ends_at at time zone 'Europe/Bucharest') > (a.starts_at at time zone 'Europe/Bucharest')::date + h.closes
    or (h.break_start is not null and (a.starts_at at time zone 'Europe/Bucharest')::time < h.break_end
      and (a.ends_at at time zone 'Europe/Bucharest')::time > h.break_start);
$$;

-- Use the same selection for preview and commit. The latter checks the reviewed
-- versions under the scheduling lock before applying any change.
create function public.preview_calendar_change(
  p_hours jsonb default null, p_from date default null, p_to date default null, p_holidays text[] default null
) returns setof public.appointments language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_barber() then raise exception 'Acces refuzat.'; end if;
  if num_nonnulls(p_hours, p_from, p_holidays) <> 1 or (p_from is null) <> (p_to is null) then
    raise exception 'Alege o singură modificare a calendarului.';
  end if;
  if p_hours is not null and (jsonb_array_length(p_hours) <> 7 or
    (select count(distinct h.weekday) from jsonb_populate_recordset(null::public.working_hours, p_hours) h
      where h.weekday between 0 and 6 and h.enabled is not null and h.opens < h.closes
      and ((h.break_start is null and h.break_end is null) or
        (h.break_start >= h.opens and h.break_end <= h.closes and h.break_start < h.break_end))) <> 7) then
    raise exception 'Verifică orele de lucru și pauzele pentru toate cele șapte zile.';
  end if;
  if p_from is not null and (p_from < (now() at time zone 'Europe/Bucharest')::date or p_to < p_from or p_to - p_from >= 90) then
    raise exception 'Alege cel mult 90 de zile, începând de astăzi sau din viitor.';
  end if;
  if exists (select 1 from unnest(p_holidays) h(id) where not exists (select 1 from public.holiday_rules r where r.id = h.id)) then
    raise exception 'Lista sărbătorilor nu este validă.';
  end if;

  return query
    select a.* from public.appointments a
    cross join lateral (select (a.starts_at at time zone 'Europe/Bucharest')::date as day) d
    left join jsonb_populate_recordset(null::public.working_hours, p_hours) h on h.weekday = extract(dow from d.day)
    where a.status in ('pending', 'confirmed') and a.ends_at > clock_timestamp()
      and case when p_hours is not null then public.outside_working_hours(a, h)
        when p_from is not null then d.day between p_from and p_to
        else public.holiday_reason(d.day, p_holidays) is not null end
    order by a.starts_at, a.id;
end $$;

create function public.apply_calendar_change(
  p_expected text[], p_hours jsonb default null, p_from date default null, p_to date default null,
  p_holidays text[] default null, p_reason text default ''
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  b_id constant uuid := '11111111-1111-4111-8111-111111111111';
  affected public.appointments[];
  reviewed text[];
  reason text := coalesce(nullif(trim(p_reason), ''), 'Zi liberă / concediu');
begin
  perform pg_advisory_xact_lock(20261104);
  select coalesce(array_agg(a), '{}'), array(select unnest(p_expected) order by 1)
    into affected, reviewed from public.preview_calendar_change(p_hours, p_from, p_to, p_holidays) a;
  if p_expected is null or reviewed is distinct from array(
    select public.appointment_review_key(a) from unnest(affected) a order by 1
  ) then raise exception 'Agenda s-a schimbat. Verifică din nou programările afectate.'; end if;
  if exists (select 1 from unnest(affected) a where a.starts_at <= clock_timestamp()) then
    raise exception 'O programare este în curs. Așteaptă încheierea ei înainte să închizi acest interval.';
  end if;

  update public.appointments a set status = 'cancelled',
    cancellation_reason = case when p_hours is not null then 'Modificarea programului de lucru / pauzei'
      when p_from is not null then reason
      else public.holiday_reason((a.starts_at at time zone 'Europe/Bucharest')::date, p_holidays) end
  where a.id in (select old.id from unnest(affected) old);

  if p_hours is not null then
    perform public.save_working_hours(p_hours);
  elsif p_from is not null then
    insert into public.days_off(barber_id, date, reason)
      select b_id, p_from + n, reason from generate_series(0, p_to - p_from) n
    on conflict(barber_id,date) do update set reason = excluded.reason;
  else
    update public.barbers set closed_holiday_ids = p_holidays where id = b_id;
  end if;

  return jsonb_build_object('cancelled', cardinality(affected), 'manual', to_jsonb(array(
    select a from unnest(affected) a where a.client_id is null order by a.starts_at, a.id
  )));
end $$;

create function public.remove_time_off(p_from date, p_to date) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_barber() then raise exception 'Acces refuzat.'; end if;
  if p_from is null or p_to is null or p_from > p_to then raise exception 'Alege un interval de date corect.'; end if;
  perform pg_advisory_xact_lock(20261104);
  delete from public.days_off where date between p_from and p_to;
end $$;

create or replace function public.queue_appointment_notification() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
  title text;
  body text;
  recipient uuid;
begin
  if tg_op = 'UPDATE' and new.status = old.status and new.starts_at = old.starts_at then return new; end if;
  select owner_id into owner from public.barbers where id = new.barber_id;
  body := new.service_name || ' · ' || to_char(new.starts_at at time zone 'Europe/Bucharest', 'DD.MM.YYYY HH24:MI');
  if tg_op = 'INSERT' then
    if new.client_id is not null then
      if owner is not null then
        insert into public.notification_outbox(user_id, appointment_id, title, body)
        values (owner, new.id, 'Programare nouă', body);
      end if;
      insert into public.notification_outbox(user_id, appointment_id, title, body)
      values (new.client_id, new.id, case when new.status = 'confirmed'
        then 'Programare confirmată' else 'Cerere de programare trimisă' end, body);
    end if;
    return new;
  end if;

  recipient := case when auth.uid() = new.client_id then owner else new.client_id end;
  if recipient is null then return new; end if;
  title := case
    when new.status = 'cancelled' then 'Programare anulată'
    when new.starts_at <> old.starts_at and auth.uid() = new.client_id
      and new.starts_at = (old.reschedule_proposal->>'starts_at')::timestamptz then 'Reprogramare acceptată'
    when new.starts_at <> old.starts_at then 'Programare reprogramată'
    when new.status = 'confirmed' then 'Programare confirmată'
    when new.status = 'completed' then 'Vizită finalizată'
    when new.status = 'no_show' then 'Programare marcată ca neprezentare'
    else 'Programare actualizată' end;
  if new.status = 'cancelled' and new.cancellation_reason is not null then
    body := body || '. Motiv: ' || new.cancellation_reason || '.';
  end if;
  insert into public.notification_outbox(user_id, appointment_id, title, body)
  values (recipient, new.id, title, body);
  return new;
end $$;

revoke all on function public.appointment_review_key(public.appointments), public.touch_appointment(),
  public.check_appointment_review(uuid,text), public.orthodox_easter(integer), public.holiday_reason(date,text[]),
  public.outside_working_hours(public.appointments,public.working_hours),
  public.book_appointment(uuid,timestamptz,text,text,text,jsonb), public.change_appointment_status(uuid,text,text),
  public.reschedule_appointment(uuid,timestamptz,text), public.calendar_days_off(),
  public.preview_calendar_change(jsonb,date,date,text[]), public.apply_calendar_change(text[],jsonb,date,date,text[],text),
  public.remove_time_off(date,date) from public, anon, authenticated;
grant execute on function public.calendar_days_off() to anon, authenticated;
grant execute on function public.book_appointment(uuid,timestamptz,text,text,text,jsonb),
  public.change_appointment_status(uuid,text,text), public.reschedule_appointment(uuid,timestamptz,text),
  public.preview_calendar_change(jsonb,date,date,text[]), public.apply_calendar_change(text[],jsonb,date,date,text[],text),
  public.remove_time_off(date,date) to authenticated;

commit;
