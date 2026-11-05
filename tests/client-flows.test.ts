import test from 'node:test';
import assert from 'node:assert/strict';
import { appointmentsForUser, bookLocal, changeLocalStatus, rescheduleLocal, respondToRescheduleLocal } from '../src/lib/appointments.ts';
import { demoBarber, demoProfiles, demoSchedule, demoServices, demoSlots, demoTransaction, readDemo, writeDemo, type DemoState } from '../src/lib/demo.ts';
import { DEFAULT_CALENDAR_POLICY, openDay } from '../src/lib/calendar.ts';
import { applyHolidayPolicy, applyTimeOff, appointmentReviewKey, removeTimeOff } from '../src/lib/time-off.ts';
import { applySchedule } from '../src/lib/schedule.ts';
import { atSalon, clock } from '../src/lib/time.ts';
const now=Date.parse('2026-11-04T08:00:00Z'),day='2026-11-09',start=atSalon(day,'09:30');
const owner='demo-barber',client='demo-client',other='demo-client-2';
function fixture():DemoState{return {barber:structuredClone(demoBarber),services:structuredClone(demoServices),schedule:structuredClone(demoSchedule),profiles:structuredClone(demoProfiles),appointments:[],daysOff:[],notifications:[],calendarPolicy:structuredClone(DEFAULT_CALENDAR_POLICY),scheduleVersion:2};}
function booked(source=fixture()){return bookLocal(source,'tuns',start,client,undefined,'',now);}
const cancellations=(s:DemoState,userId=client)=>s.notifications.filter(n=>n.user_id===userId&&/anulată/.test(n.title));
const keys=(s:DemoState)=>s.appointments.filter(a=>['confirmed','pending'].includes(a.status)).map(appointmentReviewKey);

test('client rezervă luni, frizerul ia liber: anulare, notificare și istoric la ambele conturi',()=>{
  const b=booked();
  assert.equal(appointmentsForUser(b.state,client,false)[0].status,'confirmed');
  assert.ok(b.state.notifications.some(n=>n.user_id===owner&&n.title==='Programare nouă'));
  const closed=applyTimeOff(b.state,day,day,'Zi liberă',keys(b.state),now).state;
  assert.equal(appointmentsForUser(closed,client,false)[0].status,'cancelled');
  assert.equal(appointmentsForUser(closed,owner,true)[0].status,'cancelled');
  assert.deepEqual(appointmentsForUser(closed,other,false),[]);
  assert.deepEqual(appointmentsForUser(closed,other,true),[],'un client nu primește agenda frizerului prin isOwner');
  assert.equal(closed.appointments[0].cancellation_reason,'Zi liberă');
  assert.ok(closed.appointments[0].cancelled_at);
  assert.equal(cancellations(closed).length,1);assert.match(cancellations(closed)[0].body,/9 noiembrie|09:30/);
  assert.equal(cancellations(closed,other).length,0);
  assert.equal(openDay(day,closed.schedule,closed.daysOff,closed.calendarPolicy),false);
  assert.deepEqual(demoSlots(closed,'tuns',day,undefined,now),[]);
  assert.throws(()=>bookLocal(closed,'tuns',start,other,undefined,'',now),/nu mai este disponibilă/);
  assert.equal(b.state.appointments[0].status,'confirmed','previzualizarea/sursa nu este modificată');
});
test('revenirea anticipată redeschide doar zilele alese și nu reactivează rezervări',()=>{
  const b=booked(),closed=applyTimeOff(b.state,day,'2026-11-13','Concediu',keys(b.state),now).state;
  const open=removeTimeOff(closed,day,'2026-11-10');
  assert.ok(demoSlots(open,'tuns',day,undefined,now).length>0);
  assert.deepEqual(demoSlots(open,'tuns','2026-11-11',undefined,now),[]);
  assert.equal(appointmentsForUser(open,client,false)[0].status,'cancelled');
  assert.equal(open.appointments[0].cancellation_reason,'Concediu');
  assert.equal(open.notifications.length,closed.notifications.length,'redeschiderea nu trimite notificări în masă');
  const rebook=bookLocal(open,'tuns',start,client,undefined,'',now);
  assert.notEqual(rebook.id,b.id);assert.equal(rebook.state.appointments.length,2);
  assert.equal(rebook.state.appointments.find(a=>a.id===b.id)?.status,'cancelled');
});
test('concediul peste anul nou ține cont și de sărbători la redeschidere',()=>{
  const closed=applyTimeOff(fixture(),'2026-12-28','2027-01-08','Concediu',[],now).state;
  const reopened=removeTimeOff(closed,'2027-01-01','2027-01-08');
  assert.equal(openDay('2027-01-01',reopened.schedule,reopened.daysOff,reopened.calendarPolicy),false);
  assert.equal(openDay('2027-01-06',reopened.schedule,reopened.daysOff,reopened.calendarPolicy),false);
  assert.equal(openDay('2027-01-08',reopened.schedule,reopened.daysOff,reopened.calendarPolicy),true);
  assert.equal(openDay('2026-12-31',reopened.schedule,reopened.daysOff,reopened.calendarPolicy),false);
});
test('o sărbătoare activată după rezervare anulează și notifică exact o dată',()=>{
  const source=fixture();source.calendarPolicy={closedHolidayIds:[]};
  const b=bookLocal(source,'tuns',atSalon('2026-11-30','09:30'),client,undefined,'',now);
  const closed=applyHolidayPolicy(b.state,DEFAULT_CALENDAR_POLICY,keys(b.state),now).state;
  assert.equal(cancellations(closed).length,1);assert.match(cancellations(closed)[0].body,/Sfântul Andrei/);
  const again=applyHolidayPolicy(closed,DEFAULT_CALENDAR_POLICY,[],now).state;
  assert.equal(cancellations(again).length,1);
  const reopened=applyHolidayPolicy(again,{closedHolidayIds:[]},[],now).state;
  assert.equal(reopened.appointments[0].status,'cancelled');assert.equal(reopened.notifications.length,again.notifications.length);
});
test('pauza nouă anulează strict suprapunerile, cu notificare și disponibilitate actualizată',()=>{
  const b=booked();
  const hours=b.state.schedule.map(h=>h.weekday===1?{...h,break_start:'09:45',break_end:'10:15'}:h);
  const changed=applySchedule(b.state,hours,keys(b.state),now).state;
  assert.equal(changed.appointments[0].status,'cancelled');assert.equal(cancellations(changed).length,1);
  assert.ok(demoSlots(changed,'tuns',day,undefined,now).every(s=>clock(s.starts_at)>='10:15'));
  assert.equal(appointmentsForUser(changed,client,false)[0].status,'cancelled');
});
test('ziua săptămânală închisă anulează programările și notifică clienții',()=>{
  const b=booked();const hours=b.state.schedule.map(h=>h.weekday===1?{...h,enabled:false}:h);
  const closed=applySchedule(b.state,hours,keys(b.state),now).state;
  assert.equal(cancellations(closed).length,1);assert.deepEqual(demoSlots(closed,'tuns',day,undefined,now),[]);
});
test('reprogramarea de către client păstrează durata/prețul și îl notifică pe frizer',()=>{
  const b=booked();b.state.services[0].duration_minutes=60;b.state.services[0].price_cents=9000;
  const target=atSalon('2026-11-10','10:00');
  const moved=rescheduleLocal(b.state,b.id,target,client,now);
  assert.equal(moved.appointments[0].starts_at,target);
  assert.equal(Date.parse(moved.appointments[0].ends_at)-Date.parse(target),30*60000);
  assert.equal(moved.appointments[0].price_cents,5000);
  assert.ok(moved.notifications.some(n=>n.user_id===owner&&n.title==='Programare reprogramată'));
  assert.ok(demoSlots(moved,'tuns',day,undefined,now).some(s=>s.starts_at===start),'ora veche este eliberată');
  assert.equal(appointmentsForUser(moved,client,false)[0].starts_at,target);
});
test('clientul poate accepta sau refuza propunerea frizerului', () => {
  const booking = booked();
  const target = atSalon(day, '11:00');
  const proposed = rescheduleLocal(booking.state, booking.id, target, owner, now);
  const appointment = proposed.appointments[0];
  const proposal = appointment.reschedule_proposal!;
  assert.equal(appointment.starts_at, start);
  assert.equal(proposal.starts_at, target);
  assert.equal(proposed.notifications.at(-1)?.user_id, client);
  assert.throws(() => respondToRescheduleLocal(proposed, booking.id, proposal.id, true, other, now), /Doar clientul/);

  const declined = respondToRescheduleLocal(proposed, booking.id, proposal.id, false, client, now);
  assert.equal(declined.appointments[0].starts_at, start);
  assert.equal(declined.appointments[0].reschedule_proposal, null);
  assert.equal(declined.notifications.at(-1)?.title, 'Reprogramare refuzată');

  const accepted = respondToRescheduleLocal(proposed, booking.id, proposal.id, true, client, now);
  assert.equal(accepted.appointments[0].starts_at, target);
  assert.equal(accepted.appointments[0].ends_at, atSalon(day, '11:30'));
  assert.equal(accepted.appointments[0].price_cents, appointment.price_cents);
  assert.equal(accepted.appointments[0].reschedule_proposal, null);
  assert.equal(accepted.notifications.at(-1)?.title, 'Reprogramare acceptată');
  assert.throws(() => respondToRescheduleLocal(accepted, booking.id, proposal.id, true, client, now), /nu mai este valabilă/);
});

test('o propunere ocupată, expirată, înlocuită sau anulată nu mută programarea', () => {
  const booking = booked();
  const target = atSalon(day, '11:00');
  const proposed = rescheduleLocal(booking.state, booking.id, target, owner, now);
  const proposal = proposed.appointments[0].reschedule_proposal!;
  const occupied = bookLocal(proposed, 'tuns', target, other, undefined, '', now).state;
  assert.throws(() => respondToRescheduleLocal(occupied, booking.id, proposal.id, true, client, now), /nu mai este disponibilă/);
  assert.equal(occupied.appointments[0].starts_at, start);
  assert.throws(() => respondToRescheduleLocal(proposed, booking.id, proposal.id, true, client, Date.parse(proposal.expires_at)), /nu mai este valabilă/);

  const replaced = rescheduleLocal(proposed, booking.id, atSalon(day, '12:00'), owner, now);
  assert.throws(() => respondToRescheduleLocal(replaced, booking.id, proposal.id, false, client, now), /nu mai este valabilă/);
  const cancelled = changeLocalStatus(proposed, booking.id, 'cancelled', client, now);
  assert.equal(cancelled.appointments[0].reschedule_proposal, null);
  assert.throws(() => respondToRescheduleLocal(cancelled, booking.id, proposal.id, true, client, now), /nu mai este valabilă/);
});

test('frizerul mută direct programările introduse fără cont de client', () => {
  const booking = bookLocal(fixture(), 'tuns', start, owner, { name: 'Client Telefon', phone: '0700000099' }, '', now);
  const target = atSalon(day, '11:00');
  const moved = rescheduleLocal(booking.state, booking.id, target, owner, now);
  assert.equal(moved.appointments[0].starts_at, target);
  assert.equal(moved.appointments[0].reschedule_proposal, null);
});

test('nu se poate reprograma în concediu, de sărbători, în weekend, în pauză sau peste alt client',()=>{
  const b=booked();
  const closed=applyTimeOff(b.state,'2026-11-10','2026-11-10','Liber',[],now).state;
  assert.throws(()=>rescheduleLocal(closed,b.id,atSalon('2026-11-10','10:00'),client,now),/nu mai este disponibilă/);
  for(const date of ['2026-11-14','2026-11-30'])assert.throws(()=>rescheduleLocal(b.state,b.id,atSalon(date,'09:30'),client,now),/nu mai este disponibilă/);
  const paused=applySchedule(b.state,b.state.schedule.map(h=>h.weekday===1?{...h,break_start:'12:00',break_end:'13:00'}:h),[],now).state;
  assert.throws(()=>rescheduleLocal(paused,b.id,atSalon(day,'12:00'),client,now),/nu mai este disponibilă/);
  const occupied=bookLocal(b.state,'tuns',atSalon(day,'10:00'),other,undefined,'',now).state;
  assert.throws(()=>rescheduleLocal(occupied,b.id,atSalon(day,'10:00'),client,now),/nu mai este disponibilă/);
});
test('anulările manuale sunt vizibile și notifică partea cealaltă',()=>{
  const b=booked();const ownerCancel=changeLocalStatus(b.state,b.id,'cancelled',owner,now);
  assert.equal(cancellations(ownerCancel).length,1);assert.equal(appointmentsForUser(ownerCancel,client,false)[0].status,'cancelled');
  const clientCancel=changeLocalStatus(b.state,b.id,'cancelled',client,now);
  assert.equal(cancellations(clientCancel,owner).length,1);
  assert.ok(demoSlots(clientCancel,'tuns',day,undefined,now).some(s=>s.starts_at===start));
  assert.equal(changeLocalStatus(ownerCancel,b.id,'cancelled',owner,now).notifications.length,ownerCancel.notifications.length);
});
test('rezervările anulate/finalizate/neprezentate nu pot fi mutate sau reactivate',()=>{
  const b=booked();
  for(const status of ['cancelled','completed','no_show']as const){
    const source=structuredClone(b.state);source.appointments[0].status=status;
    assert.throws(()=>rescheduleLocal(source,b.id,atSalon(day,'11:00'),owner,now),/nu mai poate fi reprogramată/);
    assert.throws(()=>changeLocalStatus(source,b.id,'confirmed',owner,now),/nu mai poate fi modificată/);
  }
});
test('termenul de anulare/reprogramare se aplică clientului și clientul nu modifică alt client',()=>{
  const b=booked(),late=Date.parse(start)-30*60000;
  assert.throws(()=>changeLocalStatus(b.state,b.id,'cancelled',client,late),/Nu poți/);
  assert.throws(()=>rescheduleLocal(b.state,b.id,atSalon(day,'11:00'),client,late),/Contactează/);
  assert.throws(()=>changeLocalStatus(b.state,b.id,'cancelled',other,now),/Nu poți/);
  assert.throws(()=>rescheduleLocal(b.state,b.id,atSalon(day,'11:00'),other,now),/Contactează/);
  assert.throws(()=>changeLocalStatus(b.state,b.id,'confirmed',client,now),/Nu poți/);
  assert.equal(changeLocalStatus(b.state,b.id,'cancelled',owner,late).appointments[0].status,'cancelled');
});
test('cererea în așteptare se confirmă/anulează cu notificări pentru client',()=>{
  const s=fixture();s.barber.auto_confirm=false;const b=booked(s);
  assert.equal(b.state.appointments[0].status,'pending');
  assert.ok(b.state.notifications.some(n=>n.user_id===client&&n.title==='Cerere de programare trimisă'));
  const confirmed=changeLocalStatus(b.state,b.id,'confirmed',owner,now);
  assert.ok(confirmed.notifications.some(n=>n.user_id===client&&n.title==='Programare confirmată'));
  const closed=applyTimeOff(b.state,day,day,'Liber',keys(b.state),now).state;
  assert.equal(closed.appointments[0].status,'cancelled');assert.equal(cancellations(closed).length,1);
});
test('o programare viitoare nu se poate finaliza sau marca neprezentată',()=>{
  const b=booked();for(const status of ['completed','no_show']as const)assert.throws(()=>changeLocalStatus(b.state,b.id,status,owner,now),/nu a început/);
});
test('clientul manual este afișat pentru apel și nu primește notificări inventate',()=>{
  const b=bookLocal(fixture(),'tuns',start,owner,{name:'Client Telefon',phone:'0700000099'},'',now);
  assert.equal(b.state.appointments[0].client_id,null);
  const closed=applyTimeOff(b.state,day,day,'Liber',keys(b.state),now);
  assert.equal(closed.manual.length,1);assert.equal(closed.manual[0].client_phone,'0700000099');assert.equal(closed.state.notifications.length,0);
  assert.throws(()=>bookLocal(fixture(),'tuns',start,client,{name:'Client Telefon',phone:'0700000099'},'',now),/Nu poți/);
});
test('arhivarea serviciului păstrează rezervările și permite reprogramarea lor cu durata originală',()=>{
  const b=booked();b.state.services[0].active=false;
  assert.deepEqual(demoSlots(b.state,'tuns','2026-11-10',undefined,now),[]);
  const target=demoSlots(b.state,'tuns','2026-11-10',b.id,now)[0].starts_at;
  const moved=rescheduleLocal(b.state,b.id,target,client,now);
  assert.equal(moved.appointments[0].service_name,'Tuns clasic');
  assert.equal(moved.appointments[0].price_cents,5000);
});
test('o selecție de oră veche este refuzată după altă rezervare sau închiderea zilei',()=>{
  const first=demoSlots(fixture(),'tuns',day,undefined,now)[0].starts_at;
  const occupied=bookLocal(fixture(),'tuns',first,client,undefined,'',now).state;
  assert.throws(()=>bookLocal(occupied,'tuns',first,other,undefined,'',now),/nu mai este disponibilă/);
  const closed=applyTimeOff(fixture(),day,day,'Liber',[],now).state;
  assert.throws(()=>bookLocal(closed,'tuns',first,client,undefined,'',now),/nu mai este disponibilă/);
});
test('revenirea nu schimbă o vizită finalizată sau o programare a altui client',()=>{
  const b=booked();b.state.appointments[0].status='completed';
  const closed=applyTimeOff(b.state,day,day,'Liber',[],now).state;
  assert.equal(removeTimeOff(closed,day,day).appointments[0].status,'completed');
});
test('persistența locală propagă calendarul, istoricul și notificările printr-o singură salvare',()=>{
  const storage=new Map<string,string>();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)}});
  Object.defineProperty(globalThis,'window',{configurable:true,value:new EventTarget()});
  let events=0;window.addEventListener('atelier:demo',()=>events++);
  const b=booked();writeDemo(b.state);
  const closed=applyTimeOff(readDemo(),day,day,'Liber',keys(b.state),now);writeDemo(closed.state);
  const clientView=readDemo();assert.equal(appointmentsForUser(clientView,client,false)[0].status,'cancelled');assert.equal(cancellations(clientView).length,1);assert.deepEqual(demoSlots(clientView,'tuns',day,undefined,now),[]);assert.equal(events,2);
});
test('două cereri concurente sunt serializate; rezervarea și închiderea nu se suprascriu',async()=>{
  const storage=new Map<string,string>();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)}});
  Object.defineProperty(globalThis,'window',{configurable:true,value:new EventTarget()});
  let tail:Promise<unknown>=Promise.resolve();
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:(_name:string,fn:()=>unknown)=>{const next=tail.then(fn);tail=next.catch(()=>{});return next;}}}});
  writeDemo(fixture());
  const book=(user:string)=>demoTransaction(s=>{const b=bookLocal(s,'tuns',start,user,undefined,'',now);return {state:b.state,value:b.id};});
  const close=()=>demoTransaction(s=>{const result=applyTimeOff(s,day,day,'Liber',[],now);return {state:result.state,value:result.cancelled};});
  const race=await Promise.allSettled([book(client),book(other)]);
  assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(readDemo().appointments.length,1);
  writeDemo(fixture());const bookFirst=await Promise.allSettled([book(client),close()]);
  assert.equal(bookFirst[0].status,'fulfilled');assert.equal(bookFirst[1].status,'rejected');assert.equal(readDemo().daysOff.length,0);
  writeDemo(fixture());const closureFirst=await Promise.allSettled([close(),book(client)]);
  assert.equal(closureFirst[0].status,'fulfilled');assert.equal(closureFirst[1].status,'rejected');assert.equal(readDemo().appointments.length,0);assert.equal(readDemo().daysOff.length,1);
});

test('o reprogramare/anulare bazată pe detalii vechi nu suprascrie modificarea frizerului',()=>{
  const b=booked(),expected=appointmentReviewKey(b.state.appointments[0]);
  const moved=rescheduleLocal(b.state,b.id,atSalon(day,'11:00'),owner,now);
  assert.throws(()=>rescheduleLocal(moved,b.id,atSalon(day,'12:00'),client,now,expected),/s-a schimbat între timp/);
  assert.throws(()=>changeLocalStatus(moved,b.id,'cancelled',client,now,expected),/s-a schimbat între timp/);
  assert.equal(moved.appointments[0].starts_at, start);
  assert.equal(moved.appointments[0].reschedule_proposal?.starts_at, atSalon(day,'11:00'));
});
test('prețul/durata schimbate după alegerea orei cer o nouă verificare înainte de rezervare',async()=>{
  const {serviceReviewKey}=await import('../src/lib/appointments.ts');
  const source=fixture(),expected=serviceReviewKey(source.services[0]);source.services[0].price_cents=7000;
  assert.throws(()=>bookLocal(source,'tuns',start,client,undefined,'',now,expected),/Serviciul s-a schimbat/);
  assert.equal(source.appointments.length,0);
});

test('versiunea programării păstrează microsecundele Supabase și normalizează fusul orar', () => {
  const [appointment] = booked().state.appointments;
  assert.equal(
    appointmentReviewKey({ ...appointment, updated_at: '2026-11-04T10:00:00.123456+02:00' }),
    appointment.id + '/2026-11-04T08:00:00.123456Z',
  );
  assert.equal(
    appointmentReviewKey({ ...appointment, updated_at: '2026-11-04T08:00:00.12+00:00' }),
    appointment.id + '/2026-11-04T08:00:00.120000Z',
  );
});
