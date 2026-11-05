import type { Appointment, Schedule } from './types';
import type { DemoState } from './demo';
import { atSalon, dateKey, overlaps, weekday } from './time.ts';
import { applyAvailabilityChange, type ClosurePreview } from './time-off.ts';

const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(value);
export function validateSchedule(schedule: Schedule[], barberId: string) {
  if (schedule.length !== 7 || new Set(schedule.map(h => h.weekday)).size !== 7) throw new Error('Completează programul pentru toate cele șapte zile.');
  for (const h of schedule) {
    if (h.barber_id !== barberId || !Number.isInteger(h.weekday) || h.weekday < 0 || h.weekday > 6) throw new Error('Program de lucru invalid.');
    if (typeof h.enabled !== 'boolean') throw new Error('Starea zilei nu este validă.');
    if (!validTime(h.opens) || !validTime(h.closes) || h.opens.slice(0,5) >= h.closes.slice(0,5)) throw new Error('Ora de închidere trebuie să fie după deschidere.');
    if ((h.break_start !== null) !== (h.break_end !== null)) throw new Error('Completează ambele ore ale pauzei sau alege Fără pauză.');
    if (h.break_start !== null && h.break_end !== null && (!validTime(h.break_start) || !validTime(h.break_end) || h.break_start.slice(0,5) >= h.break_end.slice(0,5) || h.break_start.slice(0,5) < h.opens.slice(0,5) || h.break_end.slice(0,5) > h.closes.slice(0,5))) throw new Error('Pauza trebuie să fie în program, cu sfârșitul după început.');
  }
}
export function outsideSchedule(a: Appointment, schedule: Schedule[]) {
  const day = dateKey(new Date(a.starts_at));
  const hours = schedule.find(h => h.weekday === weekday(day));
  if (!hours?.enabled) return true;
  return Date.parse(a.starts_at) < Date.parse(atSalon(day, hours.opens.slice(0,5))) || Date.parse(a.ends_at) > Date.parse(atSalon(day, hours.closes.slice(0,5))) || !!(hours.break_start && hours.break_end && overlaps(a.starts_at,a.ends_at,atSalon(day,hours.break_start.slice(0,5)),atSalon(day,hours.break_end.slice(0,5))));
}
export function previewSchedule(state: DemoState, schedule: Schedule[], now = Date.now()): ClosurePreview {
  validateSchedule(schedule, state.barber.id);
  const appointments = state.appointments.filter(a => a.barber_id === state.barber.id && ['pending','confirmed'].includes(a.status) && Date.parse(a.ends_at) > now && outsideSchedule(a,schedule));
  return { appointments, manual: appointments.filter(a => !a.client_id) };
}
export function applySchedule(source: DemoState, schedule: Schedule[], expected: string[], now = Date.now()) {
  const state = structuredClone(source);
  const preview = previewSchedule(state,schedule,now);
  applyAvailabilityChange(state,preview,() => 'Modificarea programului de lucru / pauzei',expected,now);
  state.schedule = structuredClone(schedule);
  return { state, cancelled: preview.appointments.length, manual: preview.manual };
}
