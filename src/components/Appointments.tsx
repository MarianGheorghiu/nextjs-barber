import { useEffect, useState } from 'react';
import { CalendarDays, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock3, Phone, RotateCcw, UserX, X } from 'lucide-react';
import { api, friendlyError } from '../lib/api';
import { addDays, canCancel, clock, dateKey, money, prettyDate } from '../lib/time';
import { Modal } from './Modal';
import { DatePicker } from './DatePicker';
import { SearchField } from './SearchField';
import { appointmentReviewKey } from '../lib/time-off';
import { matchesSearch } from '../lib/search';
import { openDay, findOpenDay } from '../lib/calendar';
import { Select } from './Select';
import type { Appointment, Barber, CalendarPolicy, DayOff, Identity, Schedule, Status } from '../lib/types';
export const statusLabels: Record<Status, string> = { pending: 'În așteptare', confirmed: 'Confirmată', completed: 'Finalizată', cancelled: 'Anulată', no_show: 'Neprezentare' };
export function Appointments({ linkedAppointment, initialCancelId, appointments, barber, user, owner, schedule, daysOff, calendarPolicy, onBook, onReschedule, onRefresh }: { linkedAppointment?: Appointment; initialCancelId?: string; appointments: Appointment[]; barber: Barber; user: Identity; owner: boolean; schedule: Schedule[]; daysOff: DayOff[]; calendarPolicy: CalendarPolicy; onBook: () => void; onReschedule: (a: Appointment) => void; onRefresh: () => void }) {
  const [search,setSearch]=useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [, updateClock] = useState(0);
  const now = Date.now();
  const nextExpiry = appointments.reduce((soonest, appointment) => {
    const expires = Date.parse(appointment.reschedule_proposal?.expires_at ?? '');
    return expires > now ? Math.min(soonest, expires) : soonest;
  }, Infinity);
  useEffect(() => {
    if (!Number.isFinite(nextExpiry)) return;
    const timer = window.setTimeout(() => updateClock(value => value + 1), nextExpiry - Date.now());
    return () => window.clearTimeout(timer);
  }, [nextExpiry]);
  const isOpen=(day:string)=>openDay(day,schedule,daysOff,calendarPolicy);
  const linkedDate = linkedAppointment && dateKey(new Date(linkedAppointment.starts_at));
  const [date, setDate] = useState(() => linkedDate ?? findOpenDay(dateKey(), 1, schedule, daysOff, calendarPolicy) ?? '');
  const [agendaMode, setAgendaMode] = useState<'future' | 'day'>(linkedDate ? 'day' : 'future');
  function selectDay(day: string) {
    setDate(day);
    setSearch('');
    setAgendaMode('day');
  }
  const availability=JSON.stringify([schedule,daysOff,calendarPolicy]);
  useEffect(()=>{if(owner&&date!==linkedDate&&(!date||!isOpen(date)))setDate(findOpenDay(date||dateKey(),1,schedule,daysOff,calendarPolicy)??'');},[owner,date,availability,linkedDate]);
  const previous=date?findOpenDay(addDays(date,-1),-1,schedule,daysOff,calendarPolicy):null;
  const next=date?findOpenDay(addDays(date,1),1,schedule,daysOff,calendarPolicy):null; const [tab, setTab] = useState(linkedAppointment && (Date.parse(linkedAppointment.ends_at) < now || !['pending', 'confirmed'].includes(linkedAppointment.status)) ? 'Istoric' : 'Viitoare'); const [filter, setFilter] = useState('all'); const [cancel, setCancel] = useState<Appointment | null>(() => appointments.find(a => a.id === initialCancelId) ?? null); const [busy, setBusy] = useState(''); const [error, setError] = useState('');
  const future = appointments.filter(a => Date.parse(a.ends_at) >= Date.now() && ['pending', 'confirmed'].includes(a.status));
  const dayAppointments = appointments.filter(a => dateKey(new Date(a.starts_at)) === date);
  const candidates = owner ? (search.trim() ? appointments : agendaMode === 'future' ? future : dayAppointments).filter(a => filter === 'all' || a.status === filter) : tab === 'Viitoare' ? future : appointments.filter(a => !future.some(f => f.id === a.id)).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const visible = candidates.filter(a=>matchesSearch(`${a.client_name} ${a.client_phone} ${a.client_phone.replace(/\D/g,'')} ${a.service_name} ${a.notes} ${statusLabels[a.status]} ${dateKey(new Date(a.starts_at))} ${prettyDate(a.starts_at,{year:'numeric'})} ${clock(a.starts_at)}`,search));
  useEffect(()=>{
    if(!cancel)return;
    const current=appointments.find(a=>a.id===cancel.id);
    if(!current||!['pending','confirmed'].includes(current.status)){setCancel(null);setError('Programarea a fost deja anulată sau încheiată.');}
    else if(appointmentReviewKey(current)!==appointmentReviewKey(cancel)){setCancel(current);setError('Programarea s-a schimbat între timp. Verifică noua dată și oră înainte de anulare.');}
  },[appointments]);
  async function status(a: Appointment, next: Status) { setBusy(a.id); setError(''); try { await api.status(a.id, next, user.id, appointmentReviewKey(a)); setCancel(null); onRefresh(); } catch (e) { setError(friendlyError(e)); onRefresh(); } finally { setBusy(''); } }
  async function respond(appointment: Appointment, accept: boolean) {
    const proposal = appointment.reschedule_proposal;
    if (!proposal) return;
    setBusy(appointment.id);
    setError('');
    setResponseMessage('');
    try {
      await api.respondToReschedule(appointment.id, proposal.id, accept, user.id);
      setResponseMessage(accept ? 'Noua oră este confirmată.' : 'Ai refuzat propunerea. Programarea rămâne la ora actuală.');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      await onRefresh();
      setBusy('');
    }
  }
  return <section className="page-section"><div className="page-title"><div><span className="eyebrow">{owner ? 'Agenda salonului' : 'Vizitele tale'}</span><h1>{owner ? 'Agenda ta' : 'Programările tale'}</h1></div><button className="primary" onClick={onBook}><CalendarPlus size={18}/>{owner ? 'Adaugă programare' : 'Programare nouă'}</button></div>
    {owner ? <><div className="stats-grid"><div><span>Programări în această zi</span><strong>{dayAppointments.filter(a => a.status !== 'cancelled').length}<small> vizite</small></strong></div><div><span>De confirmat</span><strong>{dayAppointments.filter(a => a.status === 'pending').length}<small> cereri</small></strong></div><div><span>Servicii finalizate</span><strong>{money(dayAppointments.filter(a => a.status === 'completed').reduce((total, a) => total + a.price_cents, 0))}</strong></div></div><div className="category-pills"><button className={agendaMode === 'future' ? 'active' : ''} aria-pressed={agendaMode === 'future'} onClick={() => { setSearch(''); setFilter('all'); setAgendaMode('future'); }}>Viitoare <span>{future.length}</span></button><button className={agendaMode === 'day' ? 'active' : ''} aria-pressed={agendaMode === 'day'} onClick={() => selectDay(date)}>Pe zile</button></div><div className="agenda-toolbar"><div className="date-controls"><button className="icon-button" aria-label="Ziua anterioară" disabled={!previous} onClick={() => previous && selectDay(previous)}><ChevronLeft size={20}/></button><DatePicker label="Data agendei" value={date} onChange={selectDay} isDayEnabled={isOpen}/><button className="icon-button" aria-label="Ziua următoare" disabled={!next} onClick={() => next && selectDay(next)}><ChevronRight size={20}/></button><button className="text-button" onClick={() => selectDay(findOpenDay(dateKey(), 1, schedule, daysOff, calendarPolicy) ?? '')}>Azi</button></div><Select aria-label="Filtrează după status" value={filter} onValueChange={setFilter}><option value="all">Toate programările</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div><h2 className="agenda-date">{search.trim()?'Rezultatele căutării':agendaMode === 'future' ? 'Programări viitoare' : date?prettyDate(date, { weekday: 'long' }):'Nu sunt zile de lucru disponibile'}</h2></> : <div className="category-pills"><button className={tab === 'Viitoare' ? 'active' : ''} onClick={() => setTab('Viitoare')}>Viitoare <span>{future.length}</span></button><button className={tab === 'Istoric' ? 'active' : ''} onClick={() => setTab('Istoric')}>Istoric</button></div>}
    <SearchField value={search} onChange={setSearch} label="Caută programări" placeholder={owner?"Caută în toate programările: client, telefon, serviciu sau dată":"Caută după serviciu sau dată"}/>{search.trim()&&<p className="search-results" role="status">{visible.length===1?'O programare găsită':`${visible.length} programări găsite`}{owner?' în toate datele':''}.</p>}
    {responseMessage && <p className="success-box" role="status">{responseMessage}</p>}
    {error && <p className="error-box" role="alert">{error}</p>}
    {!visible.length ? <div className="empty panel"><CalendarDays size={35}/><h3>{search.trim() ? 'Nicio programare găsită.' : owner ? 'O zi cu loc pentru planuri noi.' : tab === 'Viitoare' ? 'Următoarea vizită începe aici.' : 'Istoricul tău va apărea aici.'}</h3><p className="muted">{search.trim() ? 'Încearcă alt nume, telefon, serviciu sau dată.' : owner ? 'Programările vor apărea aici imediat ce sunt făcute.' : 'Alege serviciul preferat și găsește o oră potrivită.'}</p><button className="secondary" onClick={onBook}>Fă o programare</button></div> : <div className="appointments-list">{visible.map(a => { const active = ['confirmed', 'pending'].includes(a.status); const editable = active && (owner || canCancel(a.starts_at, barber.cancellation_hours, now));
      const proposal = active ? a.reschedule_proposal : null;
      const proposalOpen = proposal && Date.parse(proposal.expires_at) > now;
      return <article className={`appointment-card ${a.status === 'cancelled' ? 'faded' : ''}`} key={a.id}><div className="appointment-time"><strong>{clock(a.starts_at)}</strong></div><div className="appointment-body"><div className="appointment-top"><h3>{owner ? a.client_name : a.service_name}</h3><span className={`status status-${a.status}`}>{statusLabels[a.status]}</span></div><p>{owner ? `${a.service_name}${(search.trim() || agendaMode === 'future') ? ` · ${prettyDate(a.starts_at,{year:'numeric'})}` : ''}` : `${prettyDate(a.starts_at, { weekday: 'short' })} · ${barber.name}`}</p><div className="appointment-details"><span><Clock3 size={13}/>{Math.round((Date.parse(a.ends_at) - Date.parse(a.starts_at)) / 60000)} min</span><strong>{money(a.price_cents)}</strong>{owner && <a href={`tel:${a.client_phone}`}><Phone size={13}/>{a.client_phone}</a>}</div>{a.notes && <p className="appointment-note">{a.notes}</p>}{a.status==='cancelled'&&a.cancellation_reason&&<p className="appointment-note">Motiv anulare: {a.cancellation_reason}</p>}
      {proposal && <div className="info-box">
        <strong>{proposalOpen ? 'Propunere de reprogramare' : 'Propunere expirată'}</strong>
        <p>Ora actuală: {prettyDate(a.starts_at)}, {clock(a.starts_at)}.</p>
        <p>Ora propusă: {prettyDate(proposal.starts_at)}, {clock(proposal.starts_at)}.</p>
        {proposalOpen && <p>Răspuns până la {prettyDate(proposal.expires_at)}, {clock(proposal.expires_at)}.</p>}
        <p>{!proposalOpen ? 'Programarea rămâne la ora actuală.' : owner
          ? 'În așteptarea răspunsului clientului.'
          : 'Ora actuală rămâne valabilă până la acceptare. Verificăm disponibilitatea noii ore când accepți.'}</p>
        {!owner && proposalOpen && <div className="button-row">
          <button className="primary" disabled={busy === a.id} onClick={() => respond(a, true)}>Acceptă ora</button>
          <button className="secondary" disabled={busy === a.id} onClick={() => respond(a, false)}>Refuză propunerea</button>
        </div>}
      </div>}
      {active && <div className="appointment-actions">{owner && a.status === 'pending' && <button className="secondary" disabled={busy === a.id} onClick={() => status(a, 'confirmed')}><Check size={15}/>Confirmă</button>}{owner && Date.parse(a.starts_at) <= Date.now() && <><button className="secondary" disabled={busy === a.id} onClick={() => status(a, 'completed')}><Check size={15}/>Finalizat</button><button className="secondary" disabled={busy === a.id} onClick={() => status(a, 'no_show')}><UserX size={16}/>Neprezentat</button></>}{editable && <>{Date.parse(a.starts_at) > now && <button className="secondary" disabled={busy === a.id} onClick={() => onReschedule(a)}><RotateCcw size={14}/>{owner && a.client_id ? (proposalOpen ? 'Schimbă propunerea' : 'Propune altă oră') : 'Reprogramează'}</button>}<button className="secondary danger-glass" disabled={busy === a.id} onClick={() => setCancel(a)}><X size={15}/>Anulează</button></>}{!editable && !owner && <span className="muted text-small">Pentru modificări, contactează frizerul.{barber.phone && <a href={`tel:${barber.phone}`}> Sună</a>}</span>}</div>}
    </div></article>; })}</div>}
    {cancel && <Modal title="Anulezi programarea?" onClose={() => setCancel(null)}><p>{cancel.service_name}, {prettyDate(cancel.starts_at)}, ora {clock(cancel.starts_at)}.</p><p className="muted">Intervalul va deveni disponibil pentru alt client. Programarea rămâne în istoric.</p>{error && <p className="error-box" role="alert">{error}</p>}<div className="button-row end"><button className="secondary" disabled={!!busy} onClick={() => setCancel(null)}>Păstrează</button><button className="secondary danger-glass" disabled={!!busy} onClick={() => status(cancel, 'cancelled')}>{busy ? 'Se anulează…' : 'Da, anulează'}</button></div></Modal>}
  </section>;
}
