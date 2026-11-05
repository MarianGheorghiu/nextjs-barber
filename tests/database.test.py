"""Integration checks against the TEMPORARY PostgreSQL test database only.
Usage: python3 tests/database.test.py (port 55438; NEVER production).
First apply postgres-bootstrap.sql and the application migration to that cluster.
"""
import concurrent.futures
import subprocess
import atexit
import pathlib
import uuid

BASE = ['psql', '-h', '/tmp', '-p', '55438', '-d', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
ADMIN = BASE.copy()
DB_NAME = 'atelier_test_' + uuid.uuid4().hex[:12]
subprocess.run(ADMIN + ['-c', 'create database ' + DB_NAME + ' encoding \'UTF8\' template template0;'], check=True, capture_output=True)
BASE[6] = DB_NAME
atexit.register(lambda: subprocess.run(ADMIN + ['-c', 'drop database if exists ' + DB_NAME + ' with (force);'], capture_output=True))
ROOT = pathlib.Path(__file__).resolve().parents[1]
for file in ['tests/postgres-bootstrap.sql', *sorted((ROOT / 'supabase/migrations').glob('*.sql'))]:
    applied = subprocess.run(BASE + ['-f', str(ROOT / file)], capture_output=True, text=True)
    assert applied.returncode == 0, applied.stderr
OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
CLIENT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
OTHER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

def query(sql, user=None, fail=False):
    if user:
        sql = "set role authenticated; set request.jwt.claim.sub='%s';\n" % user + sql
    p = subprocess.run(BASE, input=sql, text=True, capture_output=True)
    if fail:
        assert p.returncode != 0, 'Expected denial, got: ' + p.stdout
        return p.stderr
    assert p.returncode == 0, p.stderr
    return p.stdout.strip()

def check(name, fn):
    fn()
    print('PASS', name)

# This cluster is disposable. Set up deterministic test identities without real email.
query("""
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('%s','owner@example.test',now(),'{"first_name":"Alex","last_name":"Barber","phone":"0700000000"}'),
('%s','client@example.test',now(),'{"first_name":"Andrei","last_name":"Client","phone":"0700000001"}'),
('%s','other@example.test',now(),'{"first_name":"Mihai","last_name":"Client","phone":"0700000002"}');
update public.barbers set owner_id='%s';
""" % (OWNER,CLIENT,OTHER,OWNER))

def eq(a,b): assert a == b, (a,b)
check('client sees only their profile',lambda: eq(query('select count(*) from public.profiles;',CLIENT),'1'))
check('owner sees all clients',lambda: eq(query('select count(*) from public.profiles;',OWNER),'3'))
check('client cannot change owner',lambda: query("update public.barbers set owner_id='%s';" % CLIENT,CLIENT,True))
check('client cannot change their barber_id',lambda: query("update public.profiles set barber_id='11111111-1111-4111-8111-111111111111';",CLIENT,True))
check('client cannot insert services',lambda: query("insert into public.services(name,duration_minutes,price_cents)values('Fraud',30,0);",CLIENT,True))
check('client cannot invoke notification dispatcher',lambda: query('select public.claim_notifications();',CLIENT,True))
check('client cannot read push endpoints belonging to others',lambda: eq(query('select count(*) from public.push_subscriptions;',CLIENT),'0'))

SERVICE = query("select id from public.services where duration_minutes=60 limit 1;")
DAY = query("select d::date from generate_series(current_date+1,current_date+7,interval '1 day')d where extract(dow from d) between 1 and 5 limit 1;")
START = query("select starts_at from public.available_slots('%s','%s') limit 1;" % (SERVICE,DAY))
assert START
ID = query("select public.book_appointment('%s','%s');" % (SERVICE,START),CLIENT)
check('booking records server-side price',lambda: eq(query("select price_cents from public.appointments where id='%s';" % ID,CLIENT),'8000'))
check('client cannot read another client booking',lambda: eq(query('select count(*) from public.appointments;',OTHER),'0'))
check('direct booking writes are denied',lambda: query("update public.appointments set price_cents=0;",CLIENT,True))
check('another client cannot cancel booking',lambda: query("select public.change_appointment_status('%s','cancelled');" % ID,OTHER,True))
check('owner cannot mark a future visit completed',lambda: query("select public.change_appointment_status('%s','completed');" % ID,OWNER,True))
check('overlapping starts are unavailable for entire duration',lambda: eq(query("select count(*) from public.available_slots('%s','%s')where starts_at>='%s'::timestamptz and starts_at<'%s'::timestamptz+interval '60 minutes';" % (SERVICE,DAY,START,START)),'0'))
check('day off cannot silently erase existing appointments',lambda: query("select public.add_day_off('%s','Concediu');" % DAY,OWNER,True))
check('history is preserved after rejected day off',lambda: eq(query("select count(*) from public.appointments where id='%s';" % ID,CLIENT),'1'))
check('customer cannot exclude another booking from availability',lambda: query("select * from public.available_slots('%s','%s','%s');" % (SERVICE,DAY,ID),OTHER,True))
check('break is excluded for the full service duration',lambda: eq(query("select count(*) from public.available_slots('%s','%s') where (starts_at at time zone 'Europe/Bucharest')::time<'13:30' and (ends_at at time zone 'Europe/Bucharest')::time>'13:00';" % (SERVICE,DAY)),'0'))
check('unauthenticated booking fails',lambda: query("select public.book_appointment('%s','%s');" % (SERVICE,START),None,True))
check('single barber constraint rejects second barber',lambda: query("insert into public.barbers(id,name)values(gen_random_uuid(),'Other');",None,True))

# Proposals leave the original booking in place until the client responds.
TARGET = query("select starts_at from public.available_slots('%s','%s','%s') where starts_at > '%s'::timestamptz + interval '1 hour' limit 1;" % (SERVICE, DAY, ID, START), OWNER)
assert TARGET
query("select public.reschedule_appointment('%s','%s');" % (ID, TARGET), OWNER)
proposal = query("select reschedule_proposal->>'id' from public.appointments where id='%s';" % ID, CLIENT)
assert proposal
check('a proposal preserves the original appointment', lambda: eq(query("select starts_at from public.appointments where id='%s';" % ID, CLIENT), START))
check('only the affected client sees the proposal notification', lambda: eq(query("select count(id) from public.notification_outbox where title='Propunere de reprogramare';", OTHER), '0'))
check('affected client sees the proposal notification', lambda: eq(query("select count(id) from public.notification_outbox where title='Propunere de reprogramare';", CLIENT), '1'))
check('another client cannot accept a proposal', lambda: query("select public.respond_to_reschedule('%s','%s',true);" % (ID, proposal), OTHER, True))
query("select public.respond_to_reschedule('%s','%s',false);" % (ID, proposal), CLIENT)
check('declining preserves the original slot', lambda: eq(query("select starts_at from public.appointments where id='%s';" % ID, CLIENT), START))
check('barber receives the refusal', lambda: eq(query("select count(id) from public.notification_outbox where title='Reprogramare refuzată';", OWNER), '1'))

query("select public.reschedule_appointment('%s','%s');" % (ID, TARGET), OWNER)
current = query("select reschedule_proposal->>'id' from public.appointments where id='%s';" % ID, CLIENT)
check('an obsolete proposal cannot be accepted', lambda: query("select public.respond_to_reschedule('%s','%s',true);" % (ID, proposal), CLIENT, True))
occupied = query("select public.book_appointment('%s','%s');" % (SERVICE, TARGET), OTHER)
check('accepting an occupied slot keeps the original booking', lambda: query("select public.respond_to_reschedule('%s','%s',true);" % (ID, current), CLIENT, True))
eq(query("select starts_at from public.appointments where id='%s';" % ID, CLIENT), START)
query("select public.change_appointment_status('%s','cancelled');" % occupied, OTHER)
query("select public.respond_to_reschedule('%s','%s',true);" % (ID, current), CLIENT)
check('acceptance moves the booking and clears the proposal', lambda: eq(query("select starts_at from public.appointments where id='%s' and reschedule_proposal is null;" % ID, CLIENT), TARGET))
check('barber receives acceptance', lambda: eq(query("select count(id) from public.notification_outbox where title='Reprogramare acceptată';", OWNER), '1'))
query("update public.notification_outbox set read_at=now() where read_at is null;", CLIENT)
check('client can mark their own notifications read', lambda: eq(query("select count(id) from public.notification_outbox where read_at is null;", CLIENT), '0'))
check('client cannot mark the barber notifications read', lambda: eq(query("select read_at is null from public.notification_outbox where title='Reprogramare acceptată';", OWNER), 't'))

# Inbox dismissal is scoped by RLS and preserves the push delivery record.
query("update public.notification_outbox set dismissed_at = now() where dismissed_at is null;", CLIENT)
check('client can dismiss their notifications', lambda: eq(query("select count(id) from public.notification_outbox where dismissed_at is null;", CLIENT), '0'))
check('client cannot dismiss barber notifications', lambda: eq(query("select count(id) from public.notification_outbox where title='Reprogramare acceptată' and dismissed_at is null;", OWNER), '1'))
check('dismissal preserves the delivery record', lambda: eq(query("select count(id) from public.notification_outbox where title='Propunere de reprogramare' and dismissed_at is not null;", CLIENT), '2'))

# Cancel and reuse interval: both racing callers must not get it.
query("select public.change_appointment_status('%s','cancelled');" % ID,CLIENT)
check('cancellation retains history',lambda: eq(query("select status from public.appointments where id='%s';" % ID,CLIENT),'cancelled'))
def race(user):
    sql="set role authenticated; set request.jwt.claim.sub='%s'; select public.book_appointment('%s','%s');" % (user,SERVICE,START)
    return subprocess.run(BASE,input=sql,text=True,capture_output=True).returncode
with concurrent.futures.ThreadPoolExecutor(2) as pool:
    outcomes=list(pool.map(race,[CLIENT,OTHER]))
check('exactly one simultaneous booking succeeds',lambda: eq(sorted(outcomes),[0,3]))
check('outbox receives booking events',lambda: eq(query('select count(*)>0 from public.notification_outbox;'),'t'))
check('customer cannot modify outbox',lambda: query('delete from public.notification_outbox;',CLIENT,True))
print('All database integration checks passed.')
