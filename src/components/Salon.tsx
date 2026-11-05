import { SearchField } from './SearchField';
import { openDay, holidayReason } from '../lib/calendar';
import { matchesSearch } from '../lib/search';
import { useState } from 'react';
import { ArrowRight, CalendarDays, Check, Clock3, MapPin, Phone, Scissors, X } from 'lucide-react';
import type { Appointment, Barber, CalendarPolicy, DayOff, Profile, Schedule, Service } from '../lib/types';
import { canCancel, clock, dateKey, money, prettyDate, weekday } from '../lib/time';
const dayNames = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
export function Salon({ barber, services, schedule, daysOff, calendarPolicy, appointments, onBook, onAppointments, onCancel }: { barber: Barber; services: Service[]; schedule: Schedule[]; daysOff: DayOff[]; calendarPolicy: CalendarPolicy; profile: Profile | null; appointments: Appointment[]; onBook: (service?: Service) => void; onAppointments: () => void; onCancel: (appointment: Appointment) => void }) {
  const [search,setSearch]=useState('');
  const [category, setCategory] = useState('Toate');
  const [tab, setTab] = useState('Servicii');
  const todayOpen=openDay(dateKey(),schedule,daysOff,calendarPolicy);
  const todayReason=daysOff.find(d=>d.date===dateKey())?.reason??holidayReason(dateKey(),calendarPolicy);
  const today = schedule.find(s => s.weekday === weekday(dateKey()));
  const next = appointments.find(a => Date.parse(a.ends_at) > Date.now() && ['pending', 'confirmed'].includes(a.status));
  const categories = ['Toate', ...new Set(services.map(s => s.category))];
  return <div className="salon-page">
    <div className="salon-layout">
      <section className={`salon-pass ${next ? 'has-next' : 'no-next'}`}>
        <div className="pass-light pass-light-one"/><div className="pass-light pass-light-two"/>
        <div className="pass-intro"><span className="salon-tag"><Scissors size={17}/>{barber.shop_name}</span><h2>{barber.name}</h2><p><MapPin size={16}/>{barber.address}</p></div>
        <div className="pass-surface">
          {next ? <><div className="surface-caption"><span className="tiny-status"/>Următoarea ta programare</div><div className="pass-appointment"><div><h3>{next.service_name}</h3><p>{prettyDate(next.starts_at, { weekday: 'short' })}, ora {clock(next.starts_at)}</p><small>{next.status === 'pending' ? 'În așteptarea confirmării' : 'Confirmată'}</small></div><span className="glass-calendar"><strong>{prettyDate(next.starts_at, { day: '2-digit', month: undefined })}</strong><small>{prettyDate(next.starts_at, { month: 'short', day: undefined })}</small></span></div>{next.reschedule_proposal && Date.parse(next.reschedule_proposal.expires_at) > Date.now() && <p>Ai o propunere de reprogramare.</p>}<button className="primary full" onClick={onAppointments}>Gestionează programarea<ArrowRight size={18}/></button>{canCancel(next.starts_at, barber.cancellation_hours) && <button className="secondary danger-glass full salon-cancel" onClick={() => onCancel(next)}><X size={16}/>Anulează programarea</button>}</> : <><div className="surface-caption"><span className="tiny-status"/>Programări online</div><h3>Alegi ora. Cristi te așteaptă.</h3><p>Vezi orele libere și rezervă fără să suni.</p><button className="primary full" onClick={() => onBook()}>Alege o oră<ArrowRight size={19}/></button></>}
        </div>
        <div className="pass-foot"><Clock3 size={15}/>{todayOpen&&today ? `Program azi ${today.opens.slice(0,5)} – ${today.closes.slice(0,5)}` : `Astăzi salonul este închis${todayReason?` · ${todayReason}`:''}`}</div>
      </section>
      <section className="salon-content">
        <div className="profile-tabs" role="tablist" aria-label="Despre salon">{['Servicii','Program','Despre'].map(t => <button key={t} role="tab" aria-selected={tab===t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div>
        <div role="tabpanel" aria-label={tab}>
          {tab==='Servicii'&&<><div className="services-heading"><h2>Servicii</h2><span aria-label={`${services.length} servicii`}>{services.length}</span></div><div className="category-pills">{categories.map(c=><button className={category===c?'active':''} key={c} onClick={()=>setCategory(c)}>{c}</button>)}</div><SearchField value={search} onChange={setSearch} label="Caută servicii" placeholder="Caută un serviciu"/><div className="service-rows">{services.filter(s=>(category==='Toate'||s.category===category)&&matchesSearch(`${s.name} ${s.description} ${s.category}`,search)).map(s=><article className="glossy-service" key={s.id}><div className="glossy-service-info"><h3>{s.name}</h3><p>{s.description}</p><div className="glossy-service-meta"><span><Clock3 size={15}/>{s.duration_minutes} min</span><strong>{money(s.price_cents)}</strong></div></div><button className="service-choose" aria-label={`Programează ${s.name}`} onClick={()=>onBook(s)}><ArrowRight size={21}/><span>Alege</span></button></article>)}</div>{!services.some(s=>(category==='Toate'||s.category===category)&&matchesSearch(`${s.name} ${s.description} ${s.category}`,search))&&<p className="muted" role="status">Niciun serviciu găsit.</p>}<p className="list-footnote"><Check size={17}/>Plătești la salon. Fără plată în avans.</p></>}
          {tab==='Program'&&<div className="panel"><h2>Când ne găsești</h2><div className="hours-list">{[1,2,3,4,5,6,0].map(d=>{const h=schedule.find(s=>s.weekday===d);return <div className={weekday(dateKey())===d?'today':''} key={d}><span>{dayNames[d]}{weekday(dateKey())===d&&<small>Astăzi</small>}</span><span>{h?.enabled?`${h.opens.slice(0,5)} – ${h.closes.slice(0,5)}`:'Închis'}{h?.enabled&&h.break_start&&<small>Pauză {h.break_start.slice(0,5)} – {h.break_end?.slice(0,5)}</small>}</span></div>;})}</div><p className="muted">Orele libere țin cont de pauze și de zilele de concediu.</p></div>}
          {tab==='Despre'&&<div className="panel"><h2>{barber.shop_name}</h2><p>{barber.description}</p><p className="contact-line"><MapPin size={19}/>{barber.address}</p>{barber.phone&&<a className="secondary full" href={`tel:${barber.phone}`}><Phone size={18}/>Sună-l pe Cristi</a>}<div className="about-note"><CalendarDays size={23}/><p>Te poți programa oricând online. Dacă planurile se schimbă, poți anula sau muta vizita cu minimum {barber.cancellation_hours} ore înainte.</p></div></div>}
        </div>
      </section>
    </div>
  </div>;
}
