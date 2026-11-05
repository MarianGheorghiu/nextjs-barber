import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Edit3, Plus, Scissors, Trash2 } from 'lucide-react';
import { api, friendlyError } from '../lib/api';
import { BARBER_ID } from '../lib/supabase';
import { money } from '../lib/time';
import { appointmentReviewKey, type ClosurePreview } from '../lib/time-off';
import { ClosureReview } from './ClosureReview';
import { SearchField } from './SearchField';
import { matchesSearch } from '../lib/search';
import { Select } from './Select';
import { TimeSelect } from './TimeSelect';
import { TimeOffPanel } from './TimeOffPanel';
import { Modal } from './Modal';
import type { Barber, CalendarPolicy, DayOff, Schedule, Service } from '../lib/types';
const dayNames = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
export function Settings({ barber, services, daysOff, schedule, calendarPolicy, onRefresh }: { barber: Barber; services: Service[]; daysOff: DayOff[]; schedule: Schedule[]; calendarPolicy: CalendarPolicy; onRefresh: () => void }) {
  const [tab, setTab] = useState('Servicii'); const [editing, setEditing] = useState<Service | null>(null); const [hours, setHours] = useState(schedule); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const [serviceSearch,setServiceSearch]=useState('');
  const [daySearch,setDaySearch]=useState('');
  const [cancellationHours, setCancellationHours] = useState(String(barber.cancellation_hours));
  const [scheduleReview, setScheduleReview] = useState<{ hours: Schedule[]; preview: ClosurePreview } | null>(null);
  const [hoursDirty,setHoursDirty]=useState(false);
  const scheduleKey=JSON.stringify(schedule);
  useEffect(()=>{if(!hoursDirty)setHours(schedule);},[scheduleKey,hoursDirty]);
  useEffect(()=>setCancellationHours(String(barber.cancellation_hours)),[barber.cancellation_hours]);
  async function action(fn: () => Promise<void>, message = 'Modificările au fost salvate.') { setBusy(true); setError(''); setSuccess(''); try { await fn(); setSuccess(message); onRefresh(); return true; } catch (e) { setError(friendlyError(e)); return false; } finally { setBusy(false); } }
  async function saveService(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); const ok = await action(() => api.saveService({ ...editing!, name: String(f.get('name')).trim(), description: String(f.get('description')).trim(), duration_minutes: Number(f.get('duration')), price_cents: Math.round(Number(f.get('price')) * 100), category: String(f.get('category')).trim() || 'Tuns' })); if (ok) setEditing(null); }
  async function saveShop(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); await action(() => api.saveBarber({ ...barber, name: String(f.get('name')).trim(), shop_name: String(f.get('shop_name')).trim(), title: String(f.get('title')).trim(), address: String(f.get('address')).trim(), phone: String(f.get('phone')).trim(), description: String(f.get('description')).trim(), auto_confirm: f.has('auto_confirm'), cancellation_hours: Number(f.get('cancellation_hours')) })); }
  async function reviewHours() {
    setBusy(true); setError(''); setSuccess('');
    try { const preview = await api.previewSchedule(hours); setScheduleReview({ hours: structuredClone(hours), preview }); }
    catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }
  async function confirmHours() {
    if (!scheduleReview) return;
    setBusy(true); setError('');
    try {
      const result = await api.saveSchedule(scheduleReview.hours, scheduleReview.preview.appointments.map(appointmentReviewKey));
      setSuccess(`Programul a fost salvat. ${result.cancelled} programări anulate; ${result.cancelled-result.manual.length} notificări în conturile clienților. ${result.manual.length} clienți de contactat telefonic.`);
      setHoursDirty(false);setScheduleReview(null); onRefresh();
    } catch (e) {
      setError(friendlyError(e));
      try { const preview = await api.previewSchedule(scheduleReview.hours); setScheduleReview({ ...scheduleReview, preview }); } catch { /* Keep original review and error. */ }
    } finally { setBusy(false); }
  }
  function updateHours(day: number, key: keyof Schedule, value: string | boolean | null) { setHoursDirty(true);setHours(prev => prev.map(h => h.weekday === day ? { ...h, [key]: value } : h)); }
  return <section className="page-section"><div className="page-title"><div><span className="eyebrow">Personalizează salonul</span><h1>Setările salonului</h1></div></div><div className="category-pills">{['Servicii', 'Program de lucru', 'Zile libere', 'Sărbători', 'Profil salon'].map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => { setTab(t); setSuccess(''); setError(''); }}>{t}</button>)}</div>{error && <p className="error-box" role="alert">{error}</p>}{success && <p className="success-box" role="status"><Check size={18}/>{success}</p>}
    {tab === 'Servicii' && <><div className="section-inline"><h2>Catalogul tău</h2><button className="primary" onClick={() => setEditing({ id: crypto.randomUUID(), barber_id: BARBER_ID, name: '', description: '', duration_minutes: 30, price_cents: 5000, category: 'Tuns', active: true, sort_order: services.length + 1 })}><Plus size={18}/>Adaugă serviciu</button></div><SearchField value={serviceSearch} onChange={setServiceSearch} label="Caută servicii în salon" placeholder="Caută după serviciu sau categorie"/><div className="service-list">{services.filter(s=>matchesSearch(`${s.name} ${s.description} ${s.category}`,serviceSearch)).map(s => <article className="service-card" key={s.id}><div className="service-symbol"><Scissors/></div><div className="service-info"><h3>{s.name}</h3><p>{s.duration_minutes} min · {money(s.price_cents)}</p></div><button className="icon-button" aria-label={`Editează ${s.name}`} onClick={() => setEditing(s)}><Edit3 size={19}/></button><button className="icon-button danger" aria-label={`Arhivează ${s.name}`} disabled={busy} onClick={() => action(() => api.saveService({ ...s, active: false }), 'Serviciul a fost arhivat. Programările existente sunt păstrate.')}><Trash2 size={18}/></button></article>)}</div>{!services.some(s=>matchesSearch(`${s.name} ${s.description} ${s.category}`,serviceSearch))&&<p className="muted" role="status">Niciun serviciu găsit.</p>}<p className="small-note">Prețurile și duratele noi se aplică doar programărilor noi. Arhivarea păstrează istoricul.</p></>}
    {tab === 'Program de lucru' && <form className="panel schedule-panel" onSubmit={e => { e.preventDefault(); void reviewHours(); }}>
      <h2>O săptămână în ritmul tău</h2>
      <p className="muted">Orele sunt în fusul României. Pauza este opțională și se alege pentru fiecare zi. Înainte de salvare verifici programările afectate; anulările se fac doar după confirmare.</p>
      <SearchField value={daySearch} onChange={setDaySearch} label="Caută zi în program" placeholder="Caută ziua săptămânii"/><div className="schedule-list">{[1, 2, 3, 4, 5, 6, 0].filter(day=>matchesSearch(dayNames[day],daySearch)).map(day => {
        const h = hours.find(h => h.weekday === day)!;
        const hasBreak = h.break_start !== null || h.break_end !== null;
        return <div className={`schedule-row ${!h.enabled ? 'disabled-day' : ''}`} key={day}>
          <label className="check-label schedule-day"><input type="checkbox" checked={h.enabled} disabled={busy} onChange={e => updateHours(day, 'enabled', e.target.checked)}/>{dayNames[day]}</label>
          {h.enabled ? <>
            <div className="schedule-field"><span>Deschidere</span><TimeSelect label={`Deschidere ${dayNames[day]}`} value={h.opens} disabled={busy} onChange={v => updateHours(day, 'opens', v)}/></div>
            <div className="schedule-field"><span>Închidere</span><TimeSelect label={`Închidere ${dayNames[day]}`} value={h.closes} disabled={busy} onChange={v => updateHours(day, 'closes', v)}/></div>
            <label className="check-label break-toggle"><input type="checkbox" checked={hasBreak} disabled={busy} onChange={e => {setHoursDirty(true);setHours(prev => prev.map(row => row.weekday === day ? { ...row, break_start: e.target.checked ? '' : null, break_end: e.target.checked ? '' : null } : row));}}/>Pauză</label>
            {hasBreak ? <>
              <div className="schedule-field"><span>Pauză de la</span><TimeSelect label={`Început pauză ${dayNames[day]}`} value={h.break_start ?? ''} disabled={busy} onChange={v => updateHours(day, 'break_start', v)}/></div>
              <div className="schedule-field"><span>Până la</span><TimeSelect label={`Sfârșit pauză ${dayNames[day]}`} value={h.break_end ?? ''} disabled={busy} onChange={v => updateHours(day, 'break_end', v)}/></div>
            </> : <span className="schedule-no-break muted">Fără pauză</span>}
          </> : <span className="schedule-closed muted">Zi liberă</span>}
        </div>;
      })}</div>
      <div className="schedule-actions"><button className="primary" disabled={busy}>{busy ? 'Verificăm…' : 'Verifică și salvează programul'}<Check size={18}/></button></div>
    </form>}
    {(tab === 'Zile libere' || tab === 'Sărbători') && <TimeOffPanel key={tab} days={daysOff} calendarPolicy={calendarPolicy} mode={tab === 'Zile libere' ? 'time-off' : 'holidays'} onRefresh={onRefresh}/>}
    {tab === 'Profil salon' && <form className="panel form-stack shop-form" onSubmit={saveShop}><h2>Prima impresie contează.</h2><div className="two-fields"><label>Numele frizerului<input name="name" defaultValue={barber.name} minLength={2} maxLength={100} required/></label><label>Numele salonului<input name="shop_name" defaultValue={barber.shop_name} minLength={2} maxLength={100} required/></label></div><label>Descriere scurtă<input name="title" defaultValue={barber.title} maxLength={150}/></label><label>Adresa<input name="address" defaultValue={barber.address} maxLength={250} required/></label><label>Telefon public<input name="phone" type="tel" defaultValue={barber.phone} pattern="[+0-9 ()-]{9,20}" required/></label><label>Despre salon<textarea name="description" defaultValue={barber.description} maxLength={1000} rows={4}/></label><label className="check-label shop-confirm-toggle"><input type="checkbox" name="auto_confirm" defaultChecked={barber.auto_confirm}/>Confirmă automat programările noi</label><div className="form-field"><span>Cu câte ore înainte se poate anula online?</span><Select name="cancellation_hours" aria-label="Termen de anulare online" value={cancellationHours} onValueChange={setCancellationHours}>{[...new Set([0,1,2,3,4,6,8,12,24,48,Number(cancellationHours)])].sort((a,b)=>a-b).map(h=><option value={String(h)} key={h}>{h===0?'Oricând înainte de programare':h===1?'Cu cel puțin o oră înainte':`Cu cel puțin ${h} ore înainte`}</option>)}</Select></div><div className="shop-form-actions"><button className="primary" disabled={busy}>{busy ? 'Se salvează…' : 'Salvează profilul'}<Check size={18}/></button></div></form>}
    {scheduleReview && <Modal title="Confirmă programul de lucru" onClose={() => !busy && setScheduleReview(null)}><p>Programul săptămânal se aplică și rezervărilor viitoare.</p><div className="schedule-summary">{[1,2,3,4,5,6,0].map(day => { const h = scheduleReview.hours.find(h => h.weekday === day)!; return <p key={day}><strong>{dayNames[day]}:</strong> {h.enabled ? `${h.opens.slice(0,5)} – ${h.closes.slice(0,5)} · ${h.break_start && h.break_end ? `pauză ${h.break_start.slice(0,5)} – ${h.break_end.slice(0,5)}` : 'fără pauză'}` : 'Închis'}</p>; })}</div><ClosureReview preview={scheduleReview.preview}/>{error && <p className="error-box" role="alert">{error}</p>}<div className="button-row closure-buttons"><button className="secondary" disabled={busy} onClick={() => setScheduleReview(null)}>Renunță</button><button className="primary" disabled={busy} onClick={confirmHours}>{busy ? 'Se salvează…' : 'Confirmă'}</button></div></Modal>}
    {editing && <Modal title={editing.name ? 'Editează serviciul' : 'Un serviciu nou'} onClose={() => setEditing(null)}><form className="form-stack" onSubmit={saveService}><label>Nume serviciu<input name="name" defaultValue={editing.name} minLength={2} maxLength={120} required/></label><label>Descriere<textarea name="description" defaultValue={editing.description} maxLength={400} rows={2}/></label><div className="two-fields"><label>Durată (minute)<input name="duration" type="number" min={5} max={240} defaultValue={editing.duration_minutes} required/></label><label>Preț (lei)<input name="price" type="number" min={0} max={10000} step="0.01" defaultValue={editing.price_cents / 100} required/></label></div><label>Categorie<input name="category" defaultValue={editing.category} maxLength={60} required/></label>{error && <p className="error-box" role="alert">{error}</p>}<button className="primary full" disabled={busy}>Salvează serviciul<Check size={18}/></button></form></Modal>}
  </section>;
}
