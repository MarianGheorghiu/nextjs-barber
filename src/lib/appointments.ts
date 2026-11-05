import type { Appointment, Service, Status } from './types';
import { demoSlots, type DemoState } from './demo.ts';
import { appointmentReviewKey } from './time-off.ts';
import { openDay } from './calendar.ts';
import { outsideSchedule } from './schedule.ts';
import { canCancel, clock, dateKey, overlaps, prettyDate } from './time.ts';

export function serviceReviewKey(s:Service){return JSON.stringify([s.id,s.name,s.duration_minutes,s.price_cents,s.active]);}
function checkReview(a:Appointment,expected?:string){if(expected&&expected!==appointmentReviewKey(a))throw new Error('Programarea s-a schimbat între timp. Verifică din nou detaliile.');}
const active = (a: Appointment) => ['pending','confirmed'].includes(a.status);
function getAppointment(state: DemoState, id: string) {
  const appointment=state.appointments.find(a=>a.id===id&&a.barber_id===state.barber.id);
  if(!appointment)throw new Error('Programarea nu mai este disponibilă.');
  return appointment;
}
function notify(state:DemoState,userId:string|null,a:Appointment,title:string,body:string,now:number) {
  if(userId)state.notifications.push({id:crypto.randomUUID(),user_id:userId,appointment_id:a.id,title,body,created_at:new Date(now).toISOString(),read_at:null});
}
const details=(a:Appointment)=>`${a.service_name}, ${prettyDate(a.starts_at,{year:'numeric'})}, ora ${clock(a.starts_at)}`;
export function appointmentsForUser(state:DemoState,userId:string,isOwner:boolean):Appointment[] {
  return state.appointments.filter(a=>a.barber_id===state.barber.id&&(isOwner&&userId===state.barber.owner_id||a.client_id===userId)).sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
}
export function bookLocal(source:DemoState,serviceId:string,start:string,userId:string,manual?:{name:string;phone:string},notes='',now=Date.now(),expectedService?:string) {
  const state=structuredClone(source),owner=userId===state.barber.owner_id;
  const profile=state.profiles.find(p=>p.id===userId&&p.barber_id===state.barber.id);
  if(manual&&!owner||!manual&&(!profile||owner))throw new Error('Nu poți crea această programare.');
  if(manual&&(manual.name.trim().length<2||!/^[+0-9 ()-]{9,20}$/.test(manual.phone)))throw new Error('Completează numele și telefonul clientului.');
  if(!Number.isFinite(Date.parse(start)))throw new Error('Alege o oră validă.');
  const currentService=state.services.find(s=>s.id===serviceId);
  if(expectedService&&(!currentService||serviceReviewKey(currentService)!==expectedService))throw new Error('Serviciul s-a schimbat între timp. Verifică din nou prețul și durata.');
  const available=demoSlots(state,serviceId,dateKey(new Date(start)),undefined,now);
  const selected=available.find(s=>Date.parse(s.starts_at)===Date.parse(start));
  if(!selected)throw new Error('Ora nu mai este disponibilă. Alege alt interval.');
  const service=state.services.find(s=>s.id===serviceId)!;
  const appointment:Appointment={id:crypto.randomUUID(),barber_id:state.barber.id,client_id:manual?null:userId,client_name:manual?manual.name.trim():`${profile!.first_name} ${profile!.last_name}`,client_phone:manual?.phone??profile!.phone,service_id:service.id,service_name:service.name,price_cents:service.price_cents,starts_at:selected.starts_at,ends_at:selected.ends_at,status:state.barber.auto_confirm||manual?'confirmed':'pending',created_at:new Date(now).toISOString(),notes:notes.trim().slice(0,300)};
  state.appointments.push(appointment);
  if(!manual){notify(state,state.barber.owner_id,appointment,'Programare nouă',`${appointment.client_name}: ${details(appointment)}.`,now);notify(state,userId,appointment,appointment.status==='confirmed'?'Programare confirmată':'Cerere de programare trimisă',`${details(appointment)}. ${appointment.status==='pending'?'Așteaptă confirmarea frizerului.':'Programarea este confirmată.'}`,now);}
  return {state,id:appointment.id};
}
export function changeLocalStatus(source:DemoState,id:string,next:Status,userId:string,now=Date.now(),expected?:string) {
  const state=structuredClone(source),a=getAppointment(state,id),owner=userId===state.barber.owner_id;
  if(!owner&&(a.client_id!==userId||next!=='cancelled'||!canCancel(a.starts_at,state.barber.cancellation_hours,now)))throw new Error('Nu poți modifica această programare.');
  if(!['pending','confirmed','completed','cancelled','no_show'].includes(next)||next==='pending')throw new Error('Statusul programării nu este valid.');
  if(a.status===next)return state;
  checkReview(a,expected);
  if(!active(a))throw new Error('Programarea este încheiată sau anulată și nu mai poate fi modificată.');
  if(['completed','no_show'].includes(next)&&Date.parse(a.starts_at)>now)throw new Error('Programarea nu a început încă.');
  a.status=next;
  if(!active(a))a.reschedule_proposal=null;
  if(next==='cancelled'){a.cancellation_reason=owner?'Anulată de frizer':'Anulată de client';a.cancelled_at=new Date(now).toISOString();}
  const recipient=owner?a.client_id:state.barber.owner_id;
  const title=next==='cancelled'?'Programare anulată':next==='confirmed'?'Programare confirmată':next==='completed'?'Vizită finalizată':'Programare marcată ca neprezentare';
  notify(state,recipient,a,title,`${details(a)}. ${next==='cancelled'?(owner?'Frizerul a anulat programarea. Poți alege o altă zi.':`${a.client_name} a anulat programarea.`):title+'.'}`,now);
  return state;
}
export function rescheduleLocal(source:DemoState,id:string,start:string,userId:string,now=Date.now(),expected?:string) {
  const state=structuredClone(source),a=getAppointment(state,id),owner=userId===state.barber.owner_id;
  if(!owner&&(a.client_id!==userId||!canCancel(a.starts_at,state.barber.cancellation_hours,now)))throw new Error('Contactează frizerul pentru reprogramare.');
  if(!active(a))throw new Error('Programarea este încheiată sau anulată și nu mai poate fi reprogramată.');
  checkReview(a,expected);
  if(Date.parse(a.starts_at)<=now)throw new Error('O programare începută nu mai poate fi reprogramată.');
  if(!Number.isFinite(Date.parse(start)))throw new Error('Alege o oră validă.');
  if(Date.parse(start)===Date.parse(a.starts_at))throw new Error('Alege o oră diferită de cea actuală.');
  const selected=demoSlots(state,a.service_id,dateKey(new Date(start)),a.id,now).find(s=>Date.parse(s.starts_at)===Date.parse(start));
  if(!selected)throw new Error('Ora nu mai este disponibilă. Alege alt interval.');
  if (owner && a.client_id) {
    const expiresAt = Math.min(Date.parse(a.starts_at), Date.parse(selected.starts_at) - 15 * 60000);
    if (expiresAt <= now) throw new Error('Alege o oră care lasă timp pentru răspunsul clientului.');
    a.reschedule_proposal = {
      id: crypto.randomUUID(),
      starts_at: selected.starts_at,
      expires_at: new Date(expiresAt).toISOString(),
    };
    notify(state, a.client_id, a, 'Propunere de reprogramare',
      `Frizerul propune ${details({ ...a, starts_at: selected.starts_at })}. Acceptă sau refuză din Programări. Ora actuală rămâne valabilă până la acceptare.`, now);
    return state;
  }
  const old=details(a);
  a.reschedule_proposal = null;
  a.starts_at=selected.starts_at;a.ends_at=selected.ends_at;
  notify(state,owner?a.client_id:state.barber.owner_id,a,'Programare reprogramată',`Programarea ${old} a fost mutată: ${details(a)}.`,now);
  return state;
}

export function respondToRescheduleLocal(
  source: DemoState, id: string, proposalId: string, accept: boolean, userId: string, now = Date.now(),
) {
  const state = structuredClone(source);
  const appointment = getAppointment(state, id);
  if (!userId || appointment.client_id !== userId) throw new Error('Doar clientul programării poate răspunde.');
  const proposal = appointment.reschedule_proposal;
  if (!active(appointment) || !proposal || proposal.id !== proposalId || Date.parse(proposal.expires_at) <= now) {
    throw new Error('Propunerea nu mai este valabilă. Verifică programarea actuală.');
  }

  if (accept) {
    const duration = Date.parse(appointment.ends_at) - Date.parse(appointment.starts_at);
    const moved = { ...appointment, starts_at: proposal.starts_at, ends_at: new Date(Date.parse(proposal.starts_at) + duration).toISOString() };
    const day = dateKey(new Date(moved.starts_at));
    // Recheck the exact interval. The generated grid may shift when a nearby booking is cancelled.
    const blocked = !openDay(day, state.schedule, state.daysOff, state.calendarPolicy)
      || outsideSchedule(moved, state.schedule)
      || state.appointments.some(other => other.barber_id === appointment.barber_id && other.id !== id
        && (active(other) || other.status === 'completed')
        && overlaps(moved.starts_at, moved.ends_at, other.starts_at, other.ends_at));
    if (blocked) throw new Error('Ora propusă nu mai este disponibilă. Programarea actuală rămâne valabilă.');
    appointment.starts_at = moved.starts_at;
    appointment.ends_at = moved.ends_at;
    appointment.status = 'confirmed';
  }

  appointment.reschedule_proposal = null;
  notify(state, state.barber.owner_id, appointment,
    accept ? 'Reprogramare acceptată' : 'Reprogramare refuzată',
    `${appointment.client_name} a ${accept ? 'acceptat' : 'refuzat'} propunerea. Programarea rămâne stabilită pentru ${details(appointment)}.`, now);
  return state;
}
