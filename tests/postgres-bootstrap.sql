-- Test-only Supabase Auth stand-in. NEVER run this in a hosted Supabase project.
create schema auth;
create schema extensions;
do $$begin create role anon nologin; exception when duplicate_object then null; end$$;
do $$begin create role authenticated nologin; exception when duplicate_object then null; end$$;
do $$begin create role service_role nologin bypassrls; exception when duplicate_object then null; end$$;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public,auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
create publication supabase_realtime;
