import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Scissors, ShieldCheck } from 'lucide-react';
import { Modal } from './Modal';
import { Select } from './Select';
import { serviceReviewKey } from '../lib/appointments';
import { appointmentReviewKey } from '../lib/time-off';
import { api, friendlyError } from '../lib/api';
import { addDays, clock, dateKey, money, prettyDate } from '../lib/time';
import { openDay } from '../lib/calendar';
import type { Appointment, Barber, CalendarPolicy, DayOff, Identity, Schedule, Service, Slot } from '../lib/types';
export function Booking({ services, initialService, barber, schedule, daysOff, calendarPolicy, user, owner, reschedule, onClose, onAuth, onComplete, onViewAppointments }: { services: Service[]; initialService?: Service; barber: Barber; schedule: Schedule[]; daysOff: DayOff[]; calendarPolicy: CalendarPolicy; user: Identity | null; owner: boolean; reschedule?: Appointment; onClose: () => void; onAuth: () => void; onComplete: () => void; onViewAppointments: () => void }) {
  const proposesReschedule = owner && !!reschedule?.client_id;
  const originalService = reschedule ? { ...(services.find(s => s.id === reschedule.service_id) ?? services[0]), id: reschedule.service_id, name: reschedule.service_name, price_cents: reschedule.price_cents, duration_minutes: Math.round((Date.parse(reschedule.ends_at) - Date.parse(reschedule.starts_at)) / 60000) } : undefined;
  const [service, setService] = useState(originalService ?? initialService ?? services[0]);
  const [confirmedSlot, setConfirmedSlot] = useState('');
  const dayStrip = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1); const [date, setDate] = useState(dateKey()); const [week, setWeek] = useState(0); const [slot, setSlot] = useState(''); const [slots, setSlots] = useState<Slot[]>([]); const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(false); const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [notes, setNotes] = useState(''); const request = useRef(0);
  const days = Array.from({ length: 7 }, (_, i) => addDays(dateKey(), week * 7 + i)).filter(day => day <= addDays(dateKey(), 60) && openDay(day, schedule, daysOff, calendarPolicy));
  const daysKey = days.join(',');
  const availabilityKey = JSON.stringify([schedule, daysOff, calendarPolicy]);
  const catalogueKey = JSON.stringify(services);
  const serviceAvailable = !!reschedule || services.some(s=>s.id===service.id);
  useEffect(()=>{if(reschedule)return;const latest=services.find(s=>s.id===service.id)??services[0];if(latest)setService(latest);setSlot('');setStep(1);},[catalogueKey]);
  useEffect(() => { if (!days.includes(date)) { setDate(days[0] ?? ''); setSlot(''); } }, [daysKey, date]);
  async function loadSlots() { const id = ++request.current; if (!date || !serviceAvailable) { setSlots([]); setSlot(''); setLoading(false); if(!serviceAvailable)setError('Serviciul ales nu mai este disponibil. Alege alt serviciu.'); return; } setLoading(true); setError(''); try { const slots = await api.slots(service.id, date, reschedule?.id); if (id === request.current) { setSlots(slots); setSlot(current => slots.some(s => s.starts_at === current) ? current : ''); } } catch (e) { if (id === request.current) { setError(friendlyError(e)); setSlots([]); setSlot(''); setStep(1); } } finally { if (id === request.current) setLoading(false); } }
  useEffect(() => {
    if(done)return;
    const sync=()=>{if(document.visibilityState==='visible')void loadSlots();};
    const changed=()=>{void loadSlots();};
    void loadSlots();
    const timer=window.setInterval(sync,30000);
    window.addEventListener('atelier:demo',changed);window.addEventListener('storage',changed);window.addEventListener('focus',sync);document.addEventListener('visibilitychange',sync);
    return()=>{request.current++;clearInterval(timer);window.removeEventListener('atelier:demo',changed);window.removeEventListener('storage',changed);window.removeEventListener('focus',sync);document.removeEventListener('visibilitychange',sync);};
  },[service.id,date,done,availabilityKey,catalogueKey,serviceAvailable]);
  useEffect(() => { dayStrip.current?.scrollTo({ left: 0 }); }, [week]);
  async function confirm() {
    if (!user) { onAuth(); return; }
    if(!slot||loading||!serviceAvailable||!days.includes(date)){setStep(1);setError('Disponibilitatea s-a schimbat. Alege din nou ziua și ora.');return;}
    setBusy(true); setError('');
    try { if (reschedule) await api.reschedule(reschedule.id, slot, user.id, appointmentReviewKey(reschedule)); else await api.book(service.id, slot, user.id, owner ? { name: name.trim(), phone: phone.trim() } : undefined, notes, serviceReviewKey(service)); setConfirmedSlot(slot); setDone(true); onComplete(); }
    catch (e) { onComplete(); setStep(1); await loadSlots(); setError(friendlyError(e)); } finally { setBusy(false); }
  }
  return <Modal title={done ? 'Detaliile programării' : proposesReschedule ? 'Propune o altă oră' : reschedule ? 'Reprogramează vizita' : owner ? 'Adaugă o programare' : 'Alege ziua și ora'} onClose={onClose} wide>
    {done ? <div className="booking-success"><div className="success-icon"><CheckCircle2 size={42}/></div><h3>{proposesReschedule ? 'Propunerea a fost trimisă.' : reschedule ? 'Programarea a fost mutată.' : barber.auto_confirm || owner ? 'Programarea este confirmată.' : 'Cererea a ajuns la frizer.'}</h3><p>{service.name} · {prettyDate(confirmedSlot, { weekday: 'long' })}, {clock(confirmedSlot)}</p><p className="muted">{proposesReschedule ? 'Ora actuală rămâne valabilă până când clientul acceptă.' : 'Poți reveni la detaliile vizitei din Programări.'}</p><button className="primary full" onClick={owner ? onClose : onViewAppointments}>{owner ? 'Închide' : 'Vezi programările'}<Check size={18}/></button></div> : <>
      <div className="booking-progress"><span className="active"><b>1</b> Ziua și ora</span><i/><span className={step === 2 ? 'active' : ''}><b>2</b> Confirmare</span></div>
      {step === 1 || !slot ? <>
        <label className="service-select">Serviciul tău<Select aria-label="Serviciul tău" value={service.id} disabled={!!reschedule} onValueChange={value => { setService(services.find(s => s.id === value)!); setSlot(''); }}>{(reschedule ? [service] : services).map(s => <option key={s.id} value={s.id}>{s.name} · {s.duration_minutes} min · {money(s.price_cents)}</option>)}</Select></label>
        <div className="section-inline"><h3>Alege ziua</h3><div className="button-row"><button className="icon-button" aria-label="Săptămâna anterioară" disabled={week === 0} onClick={() => { setWeek(week - 1); setDate(addDays(dateKey(), (week - 1) * 7)); setSlot(''); }}><ChevronLeft size={20}/></button><button className="icon-button" aria-label="Săptămâna următoare" disabled={week === 8} onClick={() => { setWeek(week + 1); setDate(addDays(dateKey(), (week + 1) * 7)); setSlot(''); }}><ChevronRight size={20}/></button></div></div>
        <div className="date-strip" ref={dayStrip}>{days.map((d) => <button key={d} className={date === d ? 'selected' : ''} onClick={() => { setDate(d); setSlot(''); }} aria-pressed={date === d}><small>{d === dateKey() ? 'azi' : prettyDate(d, { weekday: 'short', day: undefined, month: undefined })}</small><strong>{Number(d.slice(8))}</strong><small>{prettyDate(d, { month: 'short', day: undefined })}</small></button>)}</div>
        {!days.length && <div className="info-box">Nu sunt zile de lucru în această săptămână. Alege săptămâna următoare.</div>}
        <div className="section-inline"><h3>Alege ora</h3><span className="muted text-small">Ora României</span></div>
        {loading ? <div className="loading-inline">Verificăm orele libere…</div> : !slots.length ? <div className="empty compact"><CalendarDays/><p>Nicio oră disponibilă în această zi.</p><span className="muted">Încearcă o altă zi.</span></div> : <div className="slot-grid">{slots.map(s => <button className={slot === s.starts_at ? 'selected' : ''} key={s.starts_at} onClick={() => setSlot(s.starts_at)} aria-pressed={slot === s.starts_at}>{clock(s.starts_at)}</button>)}</div>}
        {error && <p className="error-box" role="alert">{error}</p>}
        <div className="booking-footer"><span><strong>{money(service.price_cents)}</strong><small>{service.duration_minutes} minute · {barber.name}</small></span><button className="primary" disabled={!slot || loading || !date || !days.includes(date) || !serviceAvailable} onClick={() => setStep(2)}>Continuă<ArrowRight size={18}/></button></div>
      </> : <>
        <div className="booking-summary"><div className="service-mark"><Scissors size={25}/></div><h3>{service.name}</h3><p>{barber.shop_name} · {barber.name}</p><div><CalendarDays size={18}/>{prettyDate(slot, { weekday: 'long' })}</div><div><Clock3 size={18}/>{clock(slot)} – {clock(slots.find(s => s.starts_at === slot)?.ends_at ?? slot)} · {service.duration_minutes} min</div><div className="summary-total"><span>Total de plată la salon</span><strong>{money(service.price_cents)}</strong></div></div>
        {owner && !reschedule && <div className="form-stack"><label>Nume client<input value={name} onChange={e => setName(e.target.value)} placeholder="Nume și prenume" maxLength={120} required/></label><label>Telefon client<input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07xx xxx xxx" maxLength={20} required/></label></div>}
        {!reschedule && <label className="notes-label">O mențiune pentru frizer <span className="muted">(opțional)</span><textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={300} placeholder="Ce ai vrea să știm înainte de vizită?" rows={2}/></label>}
        <p className="small-note"><ShieldCheck size={17}/>Poți anula sau reprograma online cu cel puțin {barber.cancellation_hours} ore înainte.</p>
        {error && <p className="error-box" role="alert">{error}</p>}
        {!user && <div className="info-box">Intră în cont sau creează unul pentru a finaliza. Selecția ta rămâne aici.</div>}
        <div className="booking-footer"><button className="text-button" disabled={busy} onClick={() => setStep(1)}><ArrowLeft size={16}/>Înapoi</button><button className="primary" onClick={confirm} disabled={busy || loading || !slot || !serviceAvailable || !days.includes(date) || (owner && !reschedule && (name.trim().length < 2 || !/^[+0-9 ()-]{9,20}$/.test(phone)))}>{busy ? 'Se salvează…' : !user ? 'Intră și confirmă' : proposesReschedule ? 'Trimite propunerea' : reschedule ? 'Confirmă reprogramarea' : 'Confirmă programarea'}<Check size={18}/></button></div>
      </>}
    </>}
  </Modal>;
}
