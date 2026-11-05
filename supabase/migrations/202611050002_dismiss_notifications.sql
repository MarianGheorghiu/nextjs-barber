begin;

-- Keep delivery records separate from what the recipient sees in the inbox.
alter table public.notification_outbox add column dismissed_at timestamptz;
grant select (dismissed_at), update (dismissed_at) on public.notification_outbox to authenticated;

commit;
