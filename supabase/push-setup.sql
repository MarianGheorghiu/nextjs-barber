-- OPTIONAL: run after deploying push-dispatch and adding the two Vault secrets below.
-- Create Vault secrets in Dashboard -> Integrations -> Vault (not in source control):
-- atelier_project_url      = https://YOUR-NEW-PROJECT.supabase.co
-- atelier_dispatch_secret  = the SAME random value as PUSH_DISPATCH_SECRET in Edge secrets
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create or replace function public.dispatch_pending_push() returns void
language plpgsql security definer set search_path = '' as $$
declare project_url text; dispatch_secret text;
begin
  if not exists(select 1 from public.notification_outbox where delivered_at is null and next_attempt_at<=now() and attempts<8 and (locked_until is null or locked_until<now())) then return; end if;
  select decrypted_secret into project_url from vault.decrypted_secrets where name='atelier_project_url' limit 1;
  select decrypted_secret into dispatch_secret from vault.decrypted_secrets where name='atelier_dispatch_secret' limit 1;
  if project_url is null or dispatch_secret is null then return; end if;
  perform net.http_post(url:=project_url || '/functions/v1/push-dispatch',headers:=jsonb_build_object('Authorization','Bearer '||dispatch_secret,'Content-Type','application/json'),body:='{}'::jsonb,timeout_milliseconds:=10000);
end $$;
revoke all on function public.dispatch_pending_push() from public, anon, authenticated;

create or replace function public.on_notification_queued() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform public.dispatch_pending_push(); return new; end $$;
revoke all on function public.on_notification_queued() from public, anon, authenticated;
drop trigger if exists notification_dispatch on public.notification_outbox;
create trigger notification_dispatch after insert on public.notification_outbox for each statement execute function public.on_notification_queued();

-- Immediate dispatch is triggered above; this job retries failures after backoff.
-- Running again replaces the named cron job.
select cron.schedule('atelier-push-retry','* * * * *',$$select public.dispatch_pending_push();$$);
