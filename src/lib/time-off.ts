import type { Appointment, CalendarPolicy } from './types';
import type { DemoState } from './demo';
import { addDays, clock, dateKey, prettyDate } from './time.ts';
import { HOLIDAY_RULES, holidayReason } from './calendar.ts';
export type ClosurePreview = { appointments: Appointment[]; manual: Appointment[] };
function validDay(day:string) { return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day+'T12:00:00Z')) && new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day; }
export function appointmentReviewKey(a:Appointment) { return JSON.stringify([a.id,a.starts_at,a.ends_at,a.status,a.client_id,a.client_name,a.client_phone,a.service_name,a.reschedule_proposal?.id]); }
export function dateRange(from: string, to: string): string[] {
  if(!validDay(from)||!validDay(to)||from>to)throw new Error('Alege un interval de date corect.');
  const result:string[]=[];for(let day=from;day<=to;day=addDays(day,1)){result.push(day);if(result.length>90)throw new Error('Poți adăuga cel mult 90 de zile într-un singur interval.');}return result;
}
export function affectedAppointments(state: DemoState, closed: (day:string)=>boolean, now=Date.now()):ClosurePreview {
  const appointments=state.appointments.filter(a=>a.barber_id===state.barber.id&&['pending','confirmed'].includes(a.status)&&Date.parse(a.ends_at)>now&&closed(dateKey(new Date(a.starts_at))));
  return {appointments,manual:appointments.filter(a=>!a.client_id)};
}
export function applyAvailabilityChange(state:DemoState,preview:ClosurePreview,reason:(day:string)=>string,expectedKeys:string[],now:number){
  if(JSON.stringify([...expectedKeys].sort())!==JSON.stringify(preview.appointments.map(appointmentReviewKey).sort()))throw new Error('Agenda s-a schimbat. Verifică din nou programările afectate.');
  if(preview.appointments.some(a=>Date.parse(a.starts_at)<=now))throw new Error('O programare este în curs. Așteaptă încheierea ei înainte să închizi acest interval.');
  for(const a of preview.appointments){a.status='cancelled';a.reschedule_proposal=null;a.cancellation_reason=reason(dateKey(new Date(a.starts_at)));a.cancelled_at=new Date(now).toISOString();if(a.client_id)state.notifications.push({id:crypto.randomUUID(),user_id:a.client_id,appointment_id:a.id,title:'Programare anulată — Cristi Barber Shop',body:`Programarea pentru ${a.service_name}, din ${prettyDate(a.starts_at,{year:'numeric'})} la ${clock(a.starts_at)}, a fost anulată. Motiv: ${reason(dateKey(new Date(a.starts_at)))}. Te rugăm să alegi o altă zi.`,created_at:new Date(now).toISOString(),read_at:null});}
}
export function applyTimeOff(source:DemoState,from:string,to:string,reason:string,expectedKeys:string[],now=Date.now()){
  const range=dateRange(from,to);if(from<dateKey(new Date(now)))throw new Error('Zilele libere trebuie să înceapă de astăzi sau din viitor.');
  const state=structuredClone(source),closed=new Set(range);const preview=affectedAppointments(state,day=>closed.has(day),now);
  applyAvailabilityChange(state,preview,()=>reason.trim()||'Cristi și-a luat liber',expectedKeys,now);
  state.daysOff=state.daysOff.filter(d=>!closed.has(d.date));
  for(const date of range)state.daysOff.push({id:crypto.randomUUID(),barber_id:state.barber.id,date,reason:reason.trim()||'Zi liberă / concediu'});
  return {state,cancelled:preview.appointments.length,manual:preview.manual};
}
export function applyHolidayPolicy(source:DemoState,policy:CalendarPolicy,expectedKeys:string[],now=Date.now()){
  if(policy.closedHolidayIds.some(id=>!HOLIDAY_RULES.some(h=>h.id===id)))throw new Error('Lista sărbătorilor nu este validă.');
  const state=structuredClone(source);const preview=affectedAppointments(state,day=>!!holidayReason(day,policy),now);
  applyAvailabilityChange(state,preview,day=>holidayReason(day,policy)??'Sărbătoare',expectedKeys,now);state.calendarPolicy=structuredClone(policy);
  return {state,cancelled:preview.appointments.length,manual:preview.manual};
}

// One write reopens only the selected leave dates. Other closures still apply.
// Previously cancelled visits stay cancelled; reopening does not send a mass notification.
export function removeTimeOff(source:DemoState,from:string,to:string) {
  if(!validDay(from)||!validDay(to)||from>to)throw new Error('Alege un interval de date corect.');
  const state=structuredClone(source);
  state.daysOff=state.daysOff.filter(d=>d.barber_id!==state.barber.id||d.date<from||d.date>to);
  return state;
}
