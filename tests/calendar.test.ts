import test from 'node:test';
import assert from 'node:assert/strict';
import { HOLIDAY_RULES, DEFAULT_CALENDAR_POLICY, holidayDate, holidayReason, openDay, orthodoxEaster } from '../src/lib/calendar.ts';
import { serviceSlots } from '../src/lib/availability.ts';
import { affectedAppointments, applyHolidayPolicy, applyTimeOff, appointmentReviewKey, dateRange, removeTimeOff } from '../src/lib/time-off.ts';
import { demoBarber, demoProfiles, demoSchedule, demoServices, demoSlots } from '../src/lib/demo.ts';
import { applySchedule, previewSchedule, validateSchedule } from '../src/lib/schedule.ts';
import { atSalon, clock, dateKey } from '../src/lib/time.ts';
import type { Appointment } from '../src/lib/types.ts';
import type { DemoState } from '../src/lib/demo.ts';
const now=Date.parse('2026-11-04T08:00:00Z');const day='2026-11-05';
function appointment(id:string,start='09:30',duration=30,client:string|null='demo-client'):Appointment{const starts_at=atSalon(day,start);return {id,barber_id:demoBarber.id,client_id:client,client_name:'Client Test',client_phone:'0700000099',service_id:'tuns',service_name:'Tuns clasic',price_cents:5000,starts_at,ends_at:new Date(Date.parse(starts_at)+duration*60000).toISOString(),status:'confirmed',created_at:new Date(now).toISOString(),notes:''};}
function state(appointments:Appointment[]=[]):DemoState{return {barber:structuredClone(demoBarber),services:structuredClone(demoServices),profiles:structuredClone(demoProfiles),schedule:structuredClone(demoSchedule),daysOff:[],notifications:[],calendarPolicy:structuredClone(DEFAULT_CALENDAR_POLICY),scheduleVersion:2,appointments};}
const hours={...demoSchedule.find(s=>s.weekday===4)!,break_start:'12:30',break_end:'13:10'};
const review=(s:DemoState, ids:string[])=>s.appointments.filter(a=>ids.includes(a.id)).map(appointmentReviewKey);
test('30 de minute: 09:30, 10:00, 10:30; 40 de minute: 09:30, 10:10, 10:50',()=>{
  assert.deepEqual(serviceSlots(day,hours,30,[],undefined,now).slice(0,3).map(s=>clock(s.starts_at)),['09:30','10:00','10:30']);
  assert.deepEqual(serviceSlots(day,hours,40,[],undefined,now).slice(0,3).map(s=>clock(s.starts_at)),['09:30','10:10','10:50']);
});
test('o programare de 40 minute la 09:30 eliberează următorul interval exact la 10:10',()=>{
  const busy=appointment('busy','09:30',40);
  assert.equal(clock(serviceSlots(day,hours,30,[busy],undefined,now)[0].starts_at),'10:10');
  assert.equal(clock(serviceSlots(day,hours,40,[busy],undefined,now)[0].starts_at),'10:10');
});
test('pauza și programările împart ziua în intervale; nu se oferă servicii care trec peste ele',()=>{
  const slots=serviceSlots(day,hours,40,[appointment('busy','10:00',30)],undefined,now);
  assert.equal(clock(slots[0].starts_at),'10:30');
  assert.ok(slots.some(s=>clock(s.starts_at)==='13:10'));
  assert.ok(slots.every(s=>clock(s.ends_at)<='12:30'||clock(s.starts_at)>='13:10'));
  assert.ok(slots.every(s=>clock(s.ends_at)<='18:00'));
});
test('reprogramarea exclude rezervarea proprie, păstrând durata inițială',()=>{
  const s=state([appointment('own','09:30',40)]);s.services=s.services.map(v=>v.id==='tuns'?{...v,duration_minutes:60}:v);
  const slots=demoSlots(s,'tuns',day,'own',now);
  assert.equal(clock(slots[0].starts_at),'09:30');assert.equal(clock(slots[0].ends_at),'10:10');
});
test('zilele închise, concediile și sărbătorile nu sunt oferite',()=>{
  const s=state();s.daysOff=[{id:'leave',barber_id:demoBarber.id,date:day,reason:'Concediu'}];
  assert.equal(openDay('2026-11-15',s.schedule,[],s.calendarPolicy),false);
  assert.equal(openDay(day,s.schedule,s.daysOff,s.calendarPolicy),false);
  assert.equal(openDay('2026-11-30',s.schedule,[],s.calendarPolicy),false);
  assert.equal(openDay('2026-12-01',s.schedule,[],s.calendarPolicy),false);
  assert.deepEqual(demoSlots(s,'tuns',day,undefined,now),[]);
  assert.ok(openDay('2026-11-06',s.schedule,[],s.calendarPolicy));
});
test('Paștele și sărbătorile mobile se recalculează pentru fiecare an',()=>{
  assert.equal(orthodoxEaster(2026),'2026-04-12');assert.equal(orthodoxEaster(2027),'2027-05-02');
  assert.equal(holidayDate(HOLIDAY_RULES.find(h=>h.id==='ascension')!,2026),'2026-05-21');
  assert.equal(holidayDate(HOLIDAY_RULES.find(h=>h.id==='ascension')!,2027),'2027-06-10');
  assert.ok(holidayReason('2027-04-30',DEFAULT_CALENDAR_POLICY)?.includes('Vinerea Mare'));
});
test('o zi liberă anulează rezervările active, păstrează istoricul și notifică fiecare client cu cont',()=>{
  const finished={...appointment('finished'),status:'completed' as const};
  const source=state([appointment('client'),appointment('manual','10:30',30,null),finished]);
  const result=applyTimeOff(source,day,day,'Concediu',review(source,['client','manual']),now);
  assert.equal(source.appointments[0].status,'confirmed','sursa nu se modifică înainte de salvare');
  assert.equal(result.state.appointments.length,3);assert.equal(result.state.appointments[0].status,'cancelled');assert.equal(result.state.appointments[2].status,'completed');
  assert.equal(result.state.notifications.length,1);assert.equal(result.state.notifications[0].user_id,'demo-client');assert.match(result.state.notifications[0].body,/anulată/);assert.match(result.state.notifications[0].body,/Concediu/);
  assert.equal(result.manual.length,1);assert.equal(result.state.daysOff[0].date,day);
  assert.deepEqual(demoSlots(result.state,'tuns',day,undefined,now),[]);
});
test('concediul blochează toate zilele intervalului și notifică doar clienții afectați',()=>{
  const other={...appointment('other'),starts_at:atSalon('2026-11-09','09:30'),ends_at:atSalon('2026-11-09','10:00'),client_id:'demo-client-2'};
  const s=state([appointment('affected'),other]);const result=applyTimeOff(s,day,'2026-11-06','Concediu',review(s,['affected']),now);
  assert.equal(result.state.daysOff.length,2);assert.equal(result.state.appointments[1].status,'confirmed');assert.equal(result.state.notifications.length,1);
});
test('agenda schimbată după previzualizare este reverificată fără modificări parțiale',()=>{
  const s=state([appointment('new')]);assert.throws(()=>applyTimeOff(s,day,day,'Concediu',[],now),/Agenda s-a schimbat/);assert.equal(s.appointments[0].status,'confirmed');assert.equal(s.daysOff.length,0);assert.equal(s.notifications.length,0);
});
test('activarea unei sărbători anulează programările acelei zile și pregătește notificarea',()=>{
  const a=appointment('holiday');a.starts_at=atSalon('2026-11-30','09:30');a.ends_at=atSalon('2026-11-30','10:00');
  const s=state([a]);s.calendarPolicy={closedHolidayIds:[]};
  const preview=affectedAppointments(s,d=>!!holidayReason(d,DEFAULT_CALENDAR_POLICY),now);assert.equal(preview.appointments.length,1);
  const result=applyHolidayPolicy(s,DEFAULT_CALENDAR_POLICY,review(s,['holiday']),now);assert.equal(result.state.appointments[0].status,'cancelled');assert.match(result.state.notifications[0].body,/Sfântul Andrei/);assert.equal(dateKey(new Date(result.state.appointments[0].starts_at)),'2026-11-30');
});


test('pauza este opțională: zi continuă, pauză aleasă și eliminarea ei',()=>{
  const s=state();assert.ok(s.schedule.every(h=>h.break_start===null&&h.break_end===null));
  const continuous=demoSlots(s,'tuns',day,undefined,now);assert.ok(continuous.some(v=>clock(v.starts_at)==='12:30'));
  const paused=s.schedule.map(h=>h.weekday===4?{...h,break_start:'12:00',break_end:'14:00'}:h);
  const result=applySchedule(s,paused,[],now);assert.ok(demoSlots(result.state,'tuns',day,undefined,now).every(v=>clock(v.ends_at)<='12:00'||clock(v.starts_at)>='14:00'));
  const reopened=applySchedule(result.state,s.schedule,[],now);assert.deepEqual(demoSlots(reopened.state,'tuns',day,undefined,now),continuous);
});
test('programul respinge pauze incomplete, inverse, în afara zilei și ore de lucru invalide',()=>{
  const s=state();
  for(const patch of [{break_start:'12:00'},{break_start:'',break_end:''},{break_start:'13:00',break_end:'12:00'},{break_start:'08:00',break_end:'10:00'},{opens:'18:00',closes:'09:00'},{closes:'25:00'}]){
    assert.throws(()=>validateSchedule(s.schedule.map(h=>h.weekday===4?{...h,...patch}:h),s.barber.id));
  }
  assert.throws(()=>validateSchedule(s.schedule.slice(1),s.barber.id));
});
test('schimbarea pauzei anulează strict suprapunerile; capetele intervalelor rămân libere',()=>{
  const s=state([appointment('before','11:30'),appointment('overlap','11:50'),appointment('after','13:00'),appointment('manual','12:00',30,null)]);
  const hours=s.schedule.map(h=>h.weekday===4?{...h,break_start:'12:00',break_end:'13:00'}:h);
  assert.deepEqual(previewSchedule(s,hours,now).appointments.map(a=>a.id),['overlap','manual']);
  const result=applySchedule(s,hours,review(s,['overlap','manual']),now);
  assert.equal(result.cancelled,2);assert.equal(result.manual.length,1);assert.equal(result.state.notifications.length,1);
  assert.equal(result.state.appointments[0].status,'confirmed');assert.equal(result.state.appointments[2].status,'confirmed');
  assert.equal(applySchedule(result.state,hours,[],now).state.notifications.length,1,'salvarea repetată nu duplică notificările');
});
test('închiderea zilei săptămânale și scurtarea programului verifică rezervările',()=>{
  const s=state([appointment('early'),appointment('late','17:30')]);
  const shortened=s.schedule.map(h=>h.weekday===4?{...h,closes:'17:00'}:h);
  assert.deepEqual(previewSchedule(s,shortened,now).appointments.map(a=>a.id),['late']);
  const closed=s.schedule.map(h=>h.weekday===4?{...h,enabled:false}:h);
  assert.equal(previewSchedule(s,closed,now).appointments.length,2);
});
test('reverificarea detectează o programare mutată chiar dacă ID-ul este același',()=>{
  const s=state([appointment('same')]);const expected=review(s,['same']);
  s.appointments[0].starts_at=atSalon(day,'10:00');s.appointments[0].ends_at=atSalon(day,'10:30');
  assert.throws(()=>applyTimeOff(s,day,day,'Concediu',expected,now),/Agenda s-a schimbat/);
  assert.equal(s.notifications.length,0);assert.equal(s.appointments[0].status,'confirmed');
});
test('revenirea parțială păstrează restul concediului și istoricul fără notificări noi',()=>{
  const s=state([appointment('visit')]);const closed=applyTimeOff(s,day,'2026-11-10','Concediu',review(s,['visit']),now).state;
  const reopened=removeTimeOff(closed,day,'2026-11-06');
  assert.equal(reopened.daysOff.length,4);assert.ok(openDay(day,reopened.schedule,reopened.daysOff,reopened.calendarPolicy));
  assert.ok(demoSlots(reopened,'tuns',day,undefined,now).length>0);
  assert.equal(openDay('2026-11-09',reopened.schedule,reopened.daysOff,reopened.calendarPolicy),false);
  assert.equal(reopened.appointments[0].status,'cancelled');assert.equal(reopened.notifications.length,1);
  assert.equal(closed.daysOff.length,6,'datele inițiale nu se modifică');
});
test('deblocarea concediului nu suprascrie sărbătorile sau ziua săptămânală închisă',()=>{
  const s=applyTimeOff(state(),'2026-11-28','2026-11-30','Concediu',[],now).state;
  const reopened=removeTimeOff(s,'2026-11-28','2026-11-30');
  assert.equal(reopened.daysOff.length,0);
  assert.equal(openDay('2026-11-28',reopened.schedule,[],reopened.calendarPolicy),false);
  assert.equal(openDay('2026-11-30',reopened.schedule,[],reopened.calendarPolicy),false);
  const policy=applyHolidayPolicy(reopened,{closedHolidayIds:[]},[],now).state;
  assert.ok(openDay('2026-11-30',policy.schedule,[],policy.calendarPolicy));assert.equal(policy.notifications.length,0);
});
test('datele inexistente și intervalele prea lungi sunt respinse',()=>{
  for(const [from,to] of [['2026-02-30','2026-03-01'],['2026-11-05','2026-11-04'],['2026-11-05','2027-03-05']])assert.throws(()=>dateRange(from,to));
});
test('o programare în curs nu este anulată prin închiderea zilei',()=>{
  const s=state([appointment('ongoing')]);
  assert.throws(()=>applyTimeOff(s,day,day,'Concediu',review(s,['ongoing']),Date.parse(atSalon(day,'09:40'))),/în curs/);
  assert.equal(s.appointments[0].status,'confirmed');assert.equal(s.notifications.length,0);
});

test('sărbătorile suplimentare și selecția goală sunt aplicate în calendar',()=>{
  for (const [id, date] of [['three-hierarchs','2026-01-30'],['bright-friday','2026-04-17'],['palm-sunday','2026-04-05'],['john-birth','2026-06-24'],['elijah','2026-07-20'],['john-beheading','2026-08-29'],['protection','2026-10-01'],['paraskeva','2026-10-14'],['demetrius-new','2026-10-27'],['stephen','2026-12-27']]) {
    assert.equal(holidayDate(HOLIDAY_RULES.find(h=>h.id===id)!,2026),date);
    assert.ok(holidayReason(date,DEFAULT_CALENDAR_POLICY));
    assert.equal(holidayReason(date,{closedHolidayIds:[]}),undefined);
  }
  assert.equal(holidayDate(HOLIDAY_RULES.find(h=>h.id==='bright-friday')!,2027),'2027-05-07');
  assert.equal(holidayDate(HOLIDAY_RULES.find(h=>h.id==='palm-sunday')!,2027),'2027-04-25');
});
test('deblocarea unui concediu lung reunit din mai multe intervale este atomică',()=>{
  const s=applyTimeOff(state(),'2026-11-05','2027-01-30','Concediu',[],now).state;
  const extended=applyTimeOff(s,'2027-01-31','2027-03-01','Concediu',[],now).state;
  assert.ok(extended.daysOff.length>90);
  assert.equal(removeTimeOff(extended,'2026-11-05','2027-03-01').daysOff.length,0);
  assert.equal(extended.daysOff.length,117);
});

test('agenda sare peste weekend, concediu și sărbători în ambele direcții',async()=>{
  const {findOpenDay}=await import('../src/lib/calendar.ts');
  const s=state();
  assert.equal(findOpenDay('2026-11-07',1,s.schedule,[],s.calendarPolicy),'2026-11-09');
  assert.equal(findOpenDay('2026-11-08',-1,s.schedule,[],s.calendarPolicy),'2026-11-06');
  assert.equal(findOpenDay('2026-11-28',1,s.schedule,[],s.calendarPolicy),'2026-12-02');
  const leave=[{date:'2026-11-09'},{date:'2026-11-10'}];
  assert.equal(findOpenDay('2026-11-07',1,s.schedule,leave,s.calendarPolicy),'2026-11-11');
  assert.equal(findOpenDay('2026-11-10',-1,s.schedule,leave,s.calendarPolicy),'2026-11-06');
  assert.equal(findOpenDay(day,1,s.schedule.map(h=>({...h,enabled:false})),[],s.calendarPolicy),null);
});
