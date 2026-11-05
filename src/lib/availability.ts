import type { Appointment, Schedule, Slot } from './types';
import { atSalon } from './time.ts';

// Split the working day into genuinely free intervals, then advance by the service's
// full duration. An existing appointment's exact end becomes the next interval's start.
export function serviceSlots(day: string, hours: Schedule, duration: number, appointments: Appointment[], excludeId?: string, now = Date.now()): Slot[] {
  const start=Date.parse(atSalon(day,hours.opens.slice(0,5))),end=Date.parse(atSalon(day,hours.closes.slice(0,5)));
  const busy: {start:number;end:number}[] = appointments.filter(a=>a.id!==excludeId&&['pending','confirmed','completed'].includes(a.status)).map(a=>({start:Date.parse(a.starts_at),end:Date.parse(a.ends_at)})).filter(a=>a.start<end&&a.end>start);
  if(hours.break_start&&hours.break_end)busy.push({start:Date.parse(atSalon(day,hours.break_start.slice(0,5))),end:Date.parse(atSalon(day,hours.break_end.slice(0,5)))});
  busy.sort((a,b)=>a.start-b.start);
  const windows:{start:number;end:number}[]=[];let cursor=start;
  for(const block of busy){if(block.start>cursor)windows.push({start:cursor,end:Math.min(block.start,end)});cursor=Math.max(cursor,block.end);}
  if(cursor<end)windows.push({start:cursor,end});
  const result:Slot[]=[];const step=duration*60000;
  if(!Number.isFinite(step)||step<=0)return result;
  for(const window of windows)for(let t=window.start;t+step<=window.end;t+=step){if(t>=now+15*60000)result.push({starts_at:new Date(t).toISOString(),ends_at:new Date(t+step).toISOString()});}
  return result;
}
