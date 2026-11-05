-- Fresh Supabase project only. This migration never touches the legacy schema.
begin;
create extension if not exists btree_gist with schema extensions;

create table public.barbers (
  id uuid primary key default '11111111-1111-4111-8111-111111111111',
  constraint single_barber check (id = '11111111-1111-4111-8111-111111111111'),
  owner_id uuid unique references auth.users(id) on delete restrict,
  name text not null check (length(name) between 2 and 100),
  title text not null default 'Frizerul tău de încredere',
  shop_name text not null default 'Atelier Barber', description text not null default '',
  address text not null default '', phone text not null default '',
  auto_confirm boolean not null default true,
  cancellation_hours integer not null default 2 check (cancellation_hours between 0 and 48)
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  barber_id uuid not null default '11111111-1111-4111-8111-111111111111' references public.barbers(id),
  first_name text not null check (length(trim(first_name)) between 2 and 60),
  last_name text not null check (length(trim(last_name)) between 2 and 60),
  phone text not null check (phone ~ '^[+0-9 ()-]{9,20}$'),
  created_at timestamptz not null default now()
);
create index profiles_barber on public.profiles(barber_id);
create table public.services (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null default '11111111-1111-4111-8111-111111111111' references public.barbers(id),
  name text not null check (length(trim(name)) between 2 and 120),
  description text not null default '' check (length(description) <= 400),
  duration_minutes integer not null check (duration_minutes between 5 and 240),
  price_cents integer not null check (price_cents between 0 and 1000000),
  category text not null default 'Tuns', active boolean not null default true,
  sort_order integer not null default 0
);
create index services_barber on public.services(barber_id);
create table public.working_hours (
  barber_id uuid not null references public.barbers(id), weekday integer not null check (weekday between 0 and 6),
  enabled boolean not null default true, opens time not null, closes time not null,
  break_start time, break_end time,
  primary key (barber_id, weekday),
  check (opens < closes),
  check ((break_start is null and break_end is null) or (break_start is not null and break_end is not null and break_start >= opens and break_end <= closes and break_start < break_end))
);
create table public.days_off (
  id uuid primary key default gen_random_uuid(), barber_id uuid not null references public.barbers(id),
  date date not null, reason text not null default '' check (length(reason) <= 200), unique(barber_id, date)
);
create table public.appointments (
  id uuid primary key default gen_random_uuid(), barber_id uuid not null references public.barbers(id),
  client_id uuid references public.profiles(id) on delete restrict,
  client_name text not null check (length(trim(client_name)) between 2 and 125),
  client_phone text not null check (client_phone ~ '^[+0-9 ()-]{9,20}$'),
  service_id uuid not null references public.services(id), service_name text not null,
  price_cents integer not null check (price_cents >= 0),
  starts_at timestamptz not null, ends_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('pending','confirmed','completed','cancelled','no_show')),
  notes text not null default '' check (length(notes) <= 300),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  constraint appointments_no_overlap exclude using gist
    (barber_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
    where (status in ('pending','confirmed','completed'))
);
create index appointments_client_start on public.appointments(client_id, starts_at);
create index appointments_barber_start on public.appointments(barber_id, starts_at);
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (length(endpoint) <= 2048 and endpoint ~ '^https://'),
  p256dh text not null check (length(p256dh) between 16 and 200), auth text not null check (length(auth) between 8 and 100),
  created_at timestamptz not null default now()
);
create index push_user on public.push_subscriptions(user_id);
create table public.notification_outbox (
  id bigint generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id), title text not null, body text not null,
  attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
  locked_until timestamptz, delivered_at timestamptz, last_error text, created_at timestamptz not null default now()
);
create index notification_pending on public.notification_outbox(next_attempt_at) where delivered_at is null;

create function public.is_barber() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.barbers where owner_id = (select auth.uid()));
$$;

alter table public.barbers enable row level security;
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.working_hours enable row level security;
alter table public.days_off enable row level security;
alter table public.appointments enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_outbox enable row level security;

revoke all on public.barbers, public.profiles, public.services, public.working_hours, public.days_off, public.appointments, public.push_subscriptions, public.notification_outbox from anon, authenticated;
grant select on public.barbers, public.services, public.working_hours to anon, authenticated;
grant select on public.profiles, public.appointments, public.days_off to authenticated;
grant update(first_name, last_name, phone) on public.profiles to authenticated;
grant update(name,title,shop_name,description,address,phone,auto_confirm,cancellation_hours) on public.barbers to authenticated;
grant insert, update on public.services to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.notification_outbox, public.push_subscriptions to service_role;
grant usage, select on sequence public.notification_outbox_id_seq to service_role;

create policy barber_public on public.barbers for select using (true);
create policy barber_update on public.barbers for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy profile_read on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_barber());
create policy profile_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy service_read on public.services for select using (active or public.is_barber());
create policy service_insert on public.services for insert to authenticated with check (public.is_barber());
create policy service_update on public.services for update to authenticated using (public.is_barber()) with check (public.is_barber());
create policy hours_read on public.working_hours for select using (true);
create policy days_read on public.days_off for select to authenticated using (public.is_barber());
create policy appointment_read on public.appointments for select to authenticated using (client_id = (select auth.uid()) or public.is_barber());
create policy push_read on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy push_insert on public.push_subscriptions for insert to authenticated with check (user_id = (select auth.uid()));
create policy push_update on public.push_subscriptions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy push_delete on public.push_subscriptions for delete to authenticated using (user_id = (select auth.uid()));

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, first_name, last_name, phone)
  values(new.id, trim(new.raw_user_meta_data->>'first_name'), trim(new.raw_user_meta_data->>'last_name'), trim(new.raw_user_meta_data->>'phone'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Only the caller's appointment may be excluded, preventing arbitrary occupancy probing.
create function public.available_slots(p_service_id uuid, p_date date, p_exclude_id uuid default null)
returns table(starts_at timestamptz, ends_at timestamptz) language plpgsql stable security definer set search_path = '' as $$
declare s public.services; h public.working_hours; t timestamp; finish timestamp; ignored public.appointments;
begin
  if p_date < (now() at time zone 'Europe/Bucharest')::date or p_date > (now() at time zone 'Europe/Bucharest')::date + 60 then return; end if;
  select * into s from public.services where id = p_service_id and (active or public.is_barber());
  if not found then return; end if;
  if p_exclude_id is not null then
    select * into ignored from public.appointments where id = p_exclude_id and (client_id = auth.uid() or public.is_barber()) and status in ('pending','confirmed');
    if not found then raise exception 'Acces refuzat.'; end if;
    -- Keep the originally reserved duration on a reschedule, even if the service changed.
    s.duration_minutes := (extract(epoch from (ignored.ends_at - ignored.starts_at)) / 60)::integer;
  end if;
  select * into h from public.working_hours where barber_id = s.barber_id and weekday = extract(dow from p_date) and enabled;
  if not found or exists(select 1 from public.days_off d where d.barber_id = s.barber_id and d.date = p_date) then return; end if;
  t := p_date + h.opens;
  while t + make_interval(mins => s.duration_minutes) <= p_date + h.closes loop
    finish := t + make_interval(mins => s.duration_minutes);
    starts_at := t at time zone 'Europe/Bucharest'; ends_at := finish at time zone 'Europe/Bucharest';
    if starts_at >= now() + interval '15 minutes'
      and (h.break_start is null or t >= p_date + h.break_end or finish <= p_date + h.break_start)
      and not exists(select 1 from public.appointments a where a.barber_id = s.barber_id and a.id is distinct from p_exclude_id and a.status in ('pending','confirmed','completed') and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(available_slots.starts_at,available_slots.ends_at,'[)'))
    then return next; end if;
    t := t + interval '15 minutes';
  end loop;
end $$;

create function public.book_appointment(p_service_id uuid, p_starts_at timestamptz, p_manual_name text default null, p_manual_phone text default null, p_notes text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.services; p public.profiles; b public.barbers; slot record; new_id uuid; own boolean := public.is_barber();
begin
  if auth.uid() is null then raise exception 'Intră în cont pentru a rezerva.'; end if;
  -- Serialize all scheduling mutations against working-hours and days-off changes.
  perform pg_advisory_xact_lock(20261104);
  select * into s from public.services where id = p_service_id and active;
  if not found then raise exception 'Serviciul nu mai este disponibil.'; end if;
  select * into b from public.barbers where id = s.barber_id;
  if not own and not exists(select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null) then raise exception 'Confirmă mai întâi adresa de email.'; end if;
  if p_manual_name is not null and not own then raise exception 'Acces refuzat.'; end if;
  if own and (p_manual_name is null or p_manual_phone is null) then raise exception 'Completează numele și telefonul clientului.'; end if;
  select * into p from public.profiles where id = auth.uid();
  if not found then raise exception 'Completează profilul înainte să rezervi.'; end if;
  if not own and (select count(*) from public.appointments where client_id = auth.uid() and status in ('pending','confirmed') and starts_at > now()) >= 5 then raise exception 'Ai deja 5 programări viitoare.'; end if;
  select * into slot from public.available_slots(p_service_id, (p_starts_at at time zone 'Europe/Bucharest')::date) a where a.starts_at = p_starts_at;
  if not found then raise exception 'slot_unavailable'; end if;
  insert into public.appointments(barber_id,client_id,client_name,client_phone,service_id,service_name,price_cents,starts_at,ends_at,status,notes)
  values(s.barber_id,case when own then null else auth.uid() end,case when own then trim(p_manual_name) else p.first_name || ' ' || p.last_name end,
    case when own then trim(p_manual_phone) else p.phone end,s.id,s.name,s.price_cents,slot.starts_at,slot.ends_at,case when b.auto_confirm or own then 'confirmed' else 'pending' end,coalesce(p_notes,'')) returning id into new_id;
  return new_id;
end $$;

create function public.change_appointment_status(p_id uuid, p_status text) returns void language plpgsql security definer set search_path = '' as $$
declare a public.appointments; hours integer; own boolean := public.is_barber();
begin
  if auth.uid() is null then raise exception 'Intră în cont.'; end if;
  perform pg_advisory_xact_lock(20261104);
  select * into a from public.appointments where id = p_id for update;
  if not found or (not own and a.client_id is distinct from auth.uid()) then raise exception 'Acces refuzat.'; end if;
  if a.status not in ('pending','confirmed') then raise exception 'Programarea este deja încheiată.'; end if;
  select cancellation_hours into hours from public.barbers where id = a.barber_id;
  if not own and (p_status <> 'cancelled' or a.starts_at < now() + make_interval(hours => hours)) then raise exception 'Contactează frizerul pentru modificări în ultimul moment.'; end if;
  if p_status not in ('confirmed','cancelled','completed','no_show') then raise exception 'Status invalid.'; end if;
  if p_status = 'confirmed' and a.status <> 'pending' then raise exception 'Programarea este deja confirmată.'; end if;
  if p_status in ('completed','no_show') and a.starts_at > now() then raise exception 'Programarea nu a început încă.'; end if;
  update public.appointments set status = p_status, updated_at = now() where id = p_id;
end $$;

create function public.reschedule_appointment(p_id uuid, p_starts_at timestamptz) returns void language plpgsql security definer set search_path = '' as $$
declare a public.appointments; slot record; b public.barbers; own boolean := public.is_barber();
begin
  if auth.uid() is null then raise exception 'Intră în cont.'; end if;
  perform pg_advisory_xact_lock(20261104);
  select * into a from public.appointments where id = p_id for update;
  if not found or (not own and a.client_id is distinct from auth.uid()) then raise exception 'Acces refuzat.'; end if;
  if a.status not in ('pending','confirmed') then raise exception 'Programarea este deja încheiată.'; end if;
  select * into b from public.barbers where id = a.barber_id;
  if not own and a.starts_at < now() + make_interval(hours => b.cancellation_hours) then raise exception 'Contactează frizerul pentru reprogramare.'; end if;
  select * into slot from public.available_slots(a.service_id,(p_starts_at at time zone 'Europe/Bucharest')::date,p_id) s where s.starts_at = p_starts_at;
  if not found then raise exception 'slot_unavailable'; end if;
  update public.appointments set starts_at = slot.starts_at, ends_at = slot.ends_at,
    status = case when own or b.auto_confirm then 'confirmed' else 'pending' end, updated_at = now() where id = p_id;
end $$;

create function public.save_working_hours(p_hours jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare b_id uuid := '11111111-1111-4111-8111-111111111111';
begin
  if not public.is_barber() then raise exception 'Acces refuzat.'; end if;
  perform pg_advisory_xact_lock(20261104);
  if jsonb_array_length(p_hours) <> 7 or (select count(distinct (h->>'weekday')::integer) from jsonb_array_elements(p_hours) h) <> 7 then raise exception 'Completează toate cele 7 zile.'; end if;
  insert into public.working_hours(barber_id,weekday,enabled,opens,closes,break_start,break_end)
    select b_id,(h->>'weekday')::integer,(h->>'enabled')::boolean,(h->>'opens')::time,(h->>'closes')::time,nullif(h->>'break_start','')::time,nullif(h->>'break_end','')::time from jsonb_array_elements(p_hours) h
    on conflict(barber_id,weekday) do update set enabled=excluded.enabled,opens=excluded.opens,closes=excluded.closes,break_start=excluded.break_start,break_end=excluded.break_end;
  -- Reject incompatible changes atomically; never silently delete bookings.
  if exists(select 1 from public.appointments a join public.working_hours h on h.barber_id=a.barber_id and h.weekday=extract(dow from a.starts_at at time zone 'Europe/Bucharest')
    where a.starts_at > now() and a.status in ('pending','confirmed') and
    (not h.enabled or (a.starts_at at time zone 'Europe/Bucharest')::time < h.opens or (a.ends_at at time zone 'Europe/Bucharest')::time > h.closes or
      (h.break_start is not null and (a.starts_at at time zone 'Europe/Bucharest')::time < h.break_end and (a.ends_at at time zone 'Europe/Bucharest')::time > h.break_start)))
  then raise exception 'Noul program afectează rezervări existente. Reprogramează-le sau anulează-le înainte.'; end if;
end $$;
create function public.add_day_off(p_date date, p_reason text default '') returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_barber() then raise exception 'Acces refuzat.'; end if;
  perform pg_advisory_xact_lock(20261104);
  if exists(select 1 from public.appointments where (starts_at at time zone 'Europe/Bucharest')::date = p_date and status in ('pending','confirmed')) then raise exception 'Există programări în această zi. Anulează-le sau reprogramează-le înainte.'; end if;
  insert into public.days_off(barber_id,date,reason) values('11111111-1111-4111-8111-111111111111',p_date,p_reason) on conflict(barber_id,date) do update set reason=excluded.reason;
end $$;
create function public.remove_day_off(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_barber() then raise exception 'Acces refuzat.'; end if;
  perform pg_advisory_xact_lock(20261104);
  delete from public.days_off where id=p_id;
end $$;

create function public.queue_appointment_notification() returns trigger language plpgsql security definer set search_path = '' as $$
declare owner uuid; message text;
begin
  if tg_op = 'UPDATE' and new.status = old.status and new.starts_at = old.starts_at then return new; end if;
  select owner_id into owner from public.barbers where id=new.barber_id;
  message := case when tg_op='INSERT' then 'O programare nouă a fost adăugată.' when new.status='cancelled' then 'O programare a fost anulată.' else 'O programare a fost actualizată.' end;
  if owner is not null and owner is distinct from auth.uid() then
    insert into public.notification_outbox(user_id,appointment_id,title,body) values(owner,new.id,'Atelier · Agenda ta',message);
  end if;
  if new.client_id is not null and new.client_id is distinct from auth.uid() then
    insert into public.notification_outbox(user_id,appointment_id,title,body) values(new.client_id,new.id,'Atelier · Programarea ta',message);
  end if;
  return new;
end $$;
create trigger appointment_notification after insert or update on public.appointments for each row execute function public.queue_appointment_notification();

create function public.claim_notifications() returns setof public.notification_outbox language plpgsql security definer set search_path = '' as $$
begin
  return query update public.notification_outbox set locked_until=now()+interval '2 minutes', attempts=attempts+1
    where id in (select id from public.notification_outbox where delivered_at is null and next_attempt_at<=now() and (locked_until is null or locked_until<now()) and attempts<8 order by id limit 50 for update skip locked) returning *;
end $$;

-- No SECURITY DEFINER function is executable by PUBLIC by accident.
revoke all on function public.is_barber(), public.handle_new_user(), public.available_slots(uuid,date,uuid), public.book_appointment(uuid,timestamptz,text,text,text), public.change_appointment_status(uuid,text), public.reschedule_appointment(uuid,timestamptz), public.save_working_hours(jsonb), public.add_day_off(date,text), public.remove_day_off(uuid), public.queue_appointment_notification(), public.claim_notifications() from public, anon, authenticated;
grant execute on function public.is_barber(), public.available_slots(uuid,date,uuid) to anon, authenticated;
grant execute on function public.book_appointment(uuid,timestamptz,text,text,text), public.change_appointment_status(uuid,text), public.reschedule_appointment(uuid,timestamptz), public.save_working_hours(jsonb), public.add_day_off(date,text), public.remove_day_off(uuid) to authenticated;
grant execute on function public.claim_notifications() to service_role;

insert into public.barbers(name,title,shop_name,description,address) values('Frizerul tău','Tunsori cu personalitate','Atelier Barber','Un loc pentru un look proaspăt și timp pentru tine.','Configurează adresa salonului');
insert into public.services(name,description,duration_minutes,price_cents,category,sort_order) values
 ('Tuns clasic','Un look curat, potrivit stilului tău.',30,5000,'Tuns',1),
 ('Skin fade','Tranziții precise. Finisaj impecabil.',45,6000,'Tuns',2),
 ('Tuns + aranjat barbă','Refresh complet, de la păr la barbă.',60,8000,'Pachete',3),
 ('Contur & aranjat barbă','Formă, simetrie și atenție la detalii.',30,3000,'Barbă',4),
 ('Tuns copii','Răbdare și un look pe placul celor mici.',30,4000,'Tuns',5);
insert into public.working_hours(barber_id,weekday,enabled,opens,closes,break_start,break_end)
 select '11111111-1111-4111-8111-111111111111',n,n<>0,'09:00'::time,case when n=6 then '14:00'::time else '18:00'::time end,case when n in (0,6) then null else '13:00'::time end,case when n in (0,6) then null else '13:30'::time end from generate_series(0,6)n;

-- Supabase creates this publication. Plain PostgreSQL test harness does too.
alter publication supabase_realtime add table public.appointments;
commit;
