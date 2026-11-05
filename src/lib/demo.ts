import type { Appointment, Barber, CalendarPolicy, DayOff, LocalNotification, Profile, Schedule, Service, Slot } from './types';
import { addDays, atSalon, dateKey, weekday } from './time.ts';
import { DEFAULT_CALENDAR_POLICY, openDay } from './calendar.ts';
import { serviceSlots } from './availability.ts';
const ID = '11111111-1111-4111-8111-111111111111';
export const demoBarber: Barber = { id: ID, owner_id: 'demo-barber', name: 'Cristi Epure', title: 'Frizerie și barber shop', shop_name: 'Cristi Barber Shop', description: 'Tunsori cu personalitate. Detalii făcute cu grijă. Un loc în care te simți mereu binevenit.', address: 'Borca, județul Neamț', phone: '', auto_confirm: true, cancellation_hours: 2 };
export const demoServices: Service[] = [
  { id: 'tuns', barber_id: ID, name: 'Tuns clasic', description: 'Un look curat, potrivit stilului tău.', duration_minutes: 30, price_cents: 5000, category: 'Tuns', active: true, sort_order: 1 },
  { id: 'fade', barber_id: ID, name: 'Skin fade', description: 'Tranziții precise. Finisaj impecabil.', duration_minutes: 40, price_cents: 6000, category: 'Tuns', active: true, sort_order: 2 },
  { id: 'combo', barber_id: ID, name: 'Tuns + aranjat barbă', description: 'Refresh complet, de la păr la barbă.', duration_minutes: 60, price_cents: 8000, category: 'Pachete', active: true, sort_order: 3 },
  { id: 'barba', barber_id: ID, name: 'Contur & aranjat barbă', description: 'Formă, simetrie și atenție la detalii.', duration_minutes: 30, price_cents: 3000, category: 'Barbă', active: true, sort_order: 4 },
  { id: 'copii', barber_id: ID, name: 'Tuns copii', description: 'Răbdare și un look pe placul celor mici.', duration_minutes: 30, price_cents: 4000, category: 'Tuns', active: true, sort_order: 5 },
];
export const demoSchedule: Schedule[] = Array.from({ length: 7 }, (_, weekday) => ({ barber_id: ID, weekday, enabled: weekday >= 1 && weekday <= 5, opens: '09:30', closes: '18:00', break_start: null, break_end: null }));
export const demoProfiles: Profile[] = [
  { id: 'demo-client', barber_id: ID, first_name: 'Andrei', last_name: 'Popescu', phone: '0700000001' },
  { id: 'demo-client-2', barber_id: ID, first_name: 'Mihai', last_name: 'Ionescu', phone: '0700000002' },
  { id: 'demo-client-3', barber_id: ID, first_name: 'Vlad', last_name: 'Marin', phone: '0700000003' },
];
export type DemoState = { services: Service[]; appointments: Appointment[]; schedule: Schedule[]; daysOff: DayOff[]; barber: Barber; profiles: Profile[]; notifications: LocalNotification[]; calendarPolicy: CalendarPolicy; scheduleVersion: number };
function initial(): DemoState {
  const today = dateKey();
  const day = weekday(today) === 0 ? addDays(today, 1) : weekday(today) === 6 ? addDays(today, 2) : today;
  return { services: demoServices, barber: demoBarber, schedule: demoSchedule, daysOff: [], profiles: demoProfiles, notifications: [], calendarPolicy: structuredClone(DEFAULT_CALENDAR_POLICY), scheduleVersion: 2, appointments: [
    ...['09:30', '10:30', '11:30', '14:00'].map((time, i) => {
      const profile = demoProfiles[i % 3]; const service = demoServices[i % 3]; const start = atSalon(day, time);
      return { id: `seed-${i}`, barber_id: ID, client_id: profile.id, client_name: `${profile.first_name} ${profile.last_name}`, client_phone: profile.phone, service_id: service.id, service_name: service.name, price_cents: service.price_cents, starts_at: start, ends_at: new Date(Date.parse(start) + service.duration_minutes * 60000).toISOString(), status: 'confirmed' as const, created_at: new Date().toISOString(), notes: '' };
    })
  ] };
}
export function readDemo(): DemoState {
  try { const data = localStorage.getItem('cristi.local.data.v3'); if (data) {
    const state = JSON.parse(data) as DemoState;
    state.notifications ??= [];
    state.calendarPolicy ??= structuredClone(DEFAULT_CALENDAR_POLICY);
    if (state.scheduleVersion !== 2) { state.schedule = structuredClone(demoSchedule); state.scheduleVersion = 2; state.services = state.services.map(s => s.id === 'fade' && s.duration_minutes === 45 ? { ...s, duration_minutes: 40 } : s);
      state.appointments = state.appointments.map(a => {
        const index = /^seed-[0-3]$/.test(a.id) ? Number(a.id.slice(-1)) : -1;
        if (index < 0) return a;
        const start = atSalon(dateKey(new Date(a.starts_at)), ['09:30', '10:30', '11:30', '14:00'][index]);
        const duration = index === 1 ? 40 : Math.round((Date.parse(a.ends_at) - Date.parse(a.starts_at)) / 60000);
        return { ...a, starts_at: start, ends_at: new Date(Date.parse(start) + duration * 60000).toISOString() };
      }); }
    return state;
  } } catch { /* fallback */ }
  return initial();
}
export function writeDemo(state: DemoState) { localStorage.setItem('cristi.local.data.v3', JSON.stringify(state)); window.dispatchEvent(new Event('atelier:demo')); }
// Browser-wide lock serializes booking/configuration writes across local tabs.
export async function demoTransaction<T>(change: (state: DemoState) => { state: DemoState; value: T }): Promise<T> {
  const commit=()=>{const result=change(readDemo());writeDemo(result.state);return result.value;};
  if(typeof navigator!=='undefined'&&navigator.locks)return navigator.locks.request('cristi.local.write.v3',commit);
  return commit();
}
export function demoSlots(state: DemoState, serviceId: string, day: string, excludeId?: string, now = Date.now()): Slot[] {
  const original = state.appointments.find(a => a.id === excludeId && a.service_id===serviceId && ['pending','confirmed'].includes(a.status));
  if(excludeId&&!original)return [];
  const service = state.services.find(s => s.id === serviceId && (s.active || !!original));
  const hours = state.schedule.find(s => s.weekday === weekday(day));
  if (!day || !service || !hours || !openDay(day, state.schedule, state.daysOff, state.calendarPolicy) || day < dateKey(new Date(now)) || day > addDays(dateKey(new Date(now)), 60)) return [];
  const duration = original ? Math.round((Date.parse(original.ends_at) - Date.parse(original.starts_at)) / 60000) : service.duration_minutes;
  return serviceSlots(day, hours, duration, state.appointments, excludeId, now);
}
