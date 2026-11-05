import { BARBER_ID, demoMode, supabase } from './supabase';
import { demoSlots, demoTransaction, readDemo } from './demo';
import { appointmentsForUser, bookLocal, changeLocalStatus, rescheduleLocal, respondToRescheduleLocal } from './appointments';
import { holidayReason } from './calendar';
import { affectedAppointments, applyHolidayPolicy, applyTimeOff, dateRange, removeTimeOff, type ClosurePreview } from './time-off';
import { applySchedule, previewSchedule } from './schedule';
import type { Appointment, Barber, CalendarPolicy, DayOff, LocalNotification, Profile, Schedule, Service, Slot, Status } from './types';
function db() { if (!supabase) throw new Error('Conectează noul proiect Supabase pentru a folosi aplicația reală.'); return supabase; }
function check(error: { message: string } | null) { if (error) throw new Error(error.message); }
async function pages<T>(read: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const result: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await read(from, from + 499); check(error);
    const rows = (data ?? []) as T[]; result.push(...rows);
    if (rows.length < 500) return result;
  }
}
type CalendarChange = { p_hours: Schedule[] } | { p_from: string; p_to: string } | { p_holidays: string[] };
async function previewCalendar(change: CalendarChange): Promise<ClosurePreview> {
  const appointments = await pages<Appointment>((from, to) =>
    db().rpc('preview_calendar_change', change).order('starts_at').order('id').range(from, to));
  return { appointments, manual: appointments.filter(a => !a.client_id) };
}
async function applyCalendar(change: CalendarChange, expected: string[], reason = '') {
  const { data, error } = await db().rpc('apply_calendar_change', { ...change, p_expected: expected, p_reason: reason });
  check(error);
  return data as { cancelled: number; manual: Appointment[] };
}
export const api = {
  async publicData() {
    if (demoMode) { const s = readDemo(); return { barber: s.barber, services: s.services.filter(s => s.active), schedule: s.schedule, daysOff: s.daysOff, calendarPolicy: s.calendarPolicy }; }
    const [b, s, h, daysOff] = await Promise.all([
      db().from('barbers').select('*').eq('id', BARBER_ID).single(),
      db().from('services').select('*').eq('barber_id', BARBER_ID).eq('active', true).order('sort_order'),
      db().from('working_hours').select('*').eq('barber_id', BARBER_ID).order('weekday'),
      pages<DayOff>((from, to) => db().rpc('calendar_days_off').order('date').range(from, to)),
    ]);
    check(b.error); check(s.error); check(h.error);
    const { closed_holiday_ids, ...barber } = b.data!;
    return { barber: barber as Barber, services: s.data as Service[],
      schedule: h.data as Schedule[], daysOff, calendarPolicy: { closedHolidayIds: closed_holiday_ids as string[] } };
  },
  async profile(id: string) { if (demoMode) { const profile = readDemo().profiles.find(p => p.id === id); if (profile) return profile; if (id === 'demo-barber') return { id, barber_id: BARBER_ID, first_name: 'Cristi', last_name: 'Epure', phone: '0700000000' }; throw new Error('Profilul local nu mai este disponibil. Ieși din cont și creează un cont de test nou.'); } const { data, error } = await db().from('profiles').select('*').eq('id', id).single(); check(error); return data as Profile; },
  async saveProfile(profile: Profile) { if (demoMode) { await demoTransaction(s=>{s.profiles=[...s.profiles.filter(p=>p.id!==profile.id),profile];return {state:s,value:undefined};});return; } const { error } = await db().from('profiles').update({ first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone }).eq('id', profile.id); check(error); },
  async slots(serviceId: string, date: string, excludeId?: string): Promise<Slot[]> { if (demoMode) return demoSlots(readDemo(), serviceId, date, excludeId); const { data, error } = await db().rpc('available_slots', { p_service_id: serviceId, p_date: date, p_exclude_id: excludeId ?? null }); check(error); return data ?? []; },
  async appointments(userId: string, isOwner: boolean): Promise<Appointment[]> { if (demoMode) return appointmentsForUser(readDemo(),userId,isOwner); return pages<Appointment>((from, to) => { let q = db().from('appointments').select('*').eq('barber_id', BARBER_ID).order('starts_at').order('id'); if (!isOwner) q = q.eq('client_id', userId); return q.range(from, to); }); },
  async book(serviceId: string, start: string, userId: string, manual?: { name: string; phone: string }, notes = '', expectedService?:string) {
    if (demoMode) return demoTransaction(s=>{const result=bookLocal(s,serviceId,start,userId,manual,notes,Date.now(),expectedService);return {state:result.state,value:result.id};});
    const { data, error } = await db().rpc('book_appointment', { p_service_id: serviceId, p_starts_at: start, p_manual_name: manual?.name ?? null, p_manual_phone: manual?.phone ?? null, p_notes: notes, p_expected_service: expectedService ? JSON.parse(expectedService) : null }); check(error); return data as string;
  },
  async status(id: string, status: Status, userId: string, expected?:string) {
    if (demoMode) { await demoTransaction(s=>({state:changeLocalStatus(s,id,status,userId,Date.now(),expected),value:undefined}));return; }
    const { error } = await db().rpc('change_appointment_status', { p_id: id, p_status: status, p_expected: expected ?? null }); check(error);
  },
  async reschedule(id: string, start: string, userId: string, expected?:string) {
    if (demoMode) { await demoTransaction(s=>({state:rescheduleLocal(s,id,start,userId,Date.now(),expected),value:undefined}));return; }
    const { error } = await db().rpc('reschedule_appointment', { p_id: id, p_starts_at: start, p_expected: expected ?? null }); check(error);
  },
  async respondToReschedule(id: string, proposalId: string, accept: boolean, userId: string) {
    if (demoMode) {
      await demoTransaction(state => ({ state: respondToRescheduleLocal(state, id, proposalId, accept, userId), value: undefined }));
      return;
    }
    const { error } = await db().rpc('respond_to_reschedule', { p_id: id, p_proposal_id: proposalId, p_accept: accept });
    check(error);
  },
  async clients(): Promise<Profile[]> { if (demoMode) return readDemo().profiles.filter(p => p.id !== 'demo-barber'); return pages<Profile>((from, to) => db().from('profiles').select('*').eq('barber_id', BARBER_ID).order('first_name').order('id').range(from, to)); },
  async saveService(service: Service) { if (demoMode) { await demoTransaction(s=>{s.services=[...s.services.filter(v=>v.id!==service.id),service].sort((a,b)=>a.sort_order-b.sort_order);return {state:s,value:undefined};});return; } const { error } = await db().from('services').upsert(service); check(error); },
  async saveBarber(barber: Barber) { if (demoMode) { await demoTransaction(s=>({state:{...s,barber},value:undefined}));return; } const { owner_id: _owner, id: _id, ...data } = barber; const { error } = await db().from('barbers').update(data).eq('id', BARBER_ID); check(error); },
  async previewSchedule(schedule: Schedule[]) {
    return demoMode ? previewSchedule(readDemo(), schedule) : previewCalendar({ p_hours: schedule });
  },
  async saveSchedule(schedule: Schedule[], expected: string[]) {
    if (!demoMode) return applyCalendar({ p_hours: schedule }, expected);
    return demoTransaction(s => { const result = applySchedule(s, schedule, expected); return { state: result.state, value: result }; });
  },
  async removeTimeOff(from: string, to: string) {
    if (demoMode) { await demoTransaction(s => ({ state: removeTimeOff(s, from, to), value: undefined })); return; }
    const { error } = await db().rpc('remove_time_off', { p_from: from, p_to: to });
    check(error);
  },
  async previewTimeOff(from: string, to: string) {
    if (!demoMode) return previewCalendar({ p_from: from, p_to: to });
    const range = new Set(dateRange(from, to));
    return affectedAppointments(readDemo(), day => range.has(day));
  },
  async addTimeOff(from: string, to: string, reason: string, expected: string[]) {
    if (!demoMode) return applyCalendar({ p_from: from, p_to: to }, expected, reason);
    return demoTransaction(s => { const result = applyTimeOff(s, from, to, reason, expected); return { state: result.state, value: result }; });
  },
  async previewHolidays(policy: CalendarPolicy) {
    return demoMode ? affectedAppointments(readDemo(), day => !!holidayReason(day, policy)) : previewCalendar({ p_holidays: policy.closedHolidayIds });
  },
  async saveHolidays(policy: CalendarPolicy, expected: string[]) {
    if (!demoMode) return applyCalendar({ p_holidays: policy.closedHolidayIds }, expected);
    return demoTransaction(s => { const result = applyHolidayPolicy(s, policy, expected); return { state: result.state, value: result }; });
  },
  async notifications(userId: string): Promise<LocalNotification[]> {
    if (demoMode) return readDemo().notifications.filter(n => n.user_id === userId).reverse().sort((a,b) => b.created_at.localeCompare(a.created_at));
    const { data, error } = await db().from('notification_outbox')
      .select('id,user_id,appointment_id,title,body,created_at,read_at')
      .eq('user_id', userId).is('dismissed_at', null).order('id', { ascending: false }).limit(100);
    check(error);
    return (data ?? []).map(notification => ({ ...notification, id: String(notification.id) }));
  },
  async readNotifications(userId: string, ids: string[]) {
    if (!ids.length) return;
    const readAt = new Date().toISOString();
    if (demoMode) {
      await demoTransaction(state => {
        state.notifications = state.notifications.map(n => n.user_id === userId && !n.read_at && ids.includes(n.id) ? { ...n, read_at: readAt } : n);
        return { state, value: undefined };
      });
      return;
    }
    const { error } = await db().from('notification_outbox').update({ read_at: readAt })
      .eq('user_id', userId).in('id', ids).is('dismissed_at', null).is('read_at', null);
    check(error);
  },
  async dismissNotification(userId: string, id: string) {
    if (demoMode) {
      await demoTransaction(state => {
        state.notifications = state.notifications.filter(n => n.user_id !== userId || n.id !== id);
        return { state, value: undefined };
      });
      return;
    }
    const { error } = await db().from('notification_outbox')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('user_id', userId).eq('id', id).is('dismissed_at', null);
    check(error);
  },
};
export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'A apărut o eroare. Încearcă din nou.';
  if (/overlap|exclusion|23P01|slot_unavailable/i.test(message)) return 'Ora tocmai a fost ocupată. Alege alt interval.';
  if (/Invalid login credentials/i.test(message)) return 'Emailul sau parola nu sunt corecte.';
  if (/Email not confirmed/i.test(message)) return 'Confirmă adresa de email înainte să intri în cont.';
  if (/rate limit/i.test(message)) return 'Prea multe încercări. Așteaptă puțin și încearcă din nou.';
  if (/Failed to fetch|network/i.test(message)) return 'Nu putem contacta serverul. Verifică internetul; contul tău rămâne conectat.';
  return message;
}
