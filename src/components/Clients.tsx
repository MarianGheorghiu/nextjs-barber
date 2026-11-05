import { useEffect, useState } from 'react';
import { Phone, Users } from 'lucide-react';
import { SearchField } from './SearchField';
import { matchesSearch } from '../lib/search';
import { api, friendlyError } from '../lib/api';
import { money, prettyDate } from '../lib/time';
import type { Appointment, Profile } from '../lib/types';
export function Clients({ appointments }: { appointments: Appointment[] }) {
  const [profiles, setProfiles] = useState<Profile[]>([]); const [search, setSearch] = useState(''); const [error, setError] = useState('');
  useEffect(() => { let active = true; api.clients().then(p => active && setProfiles(p)).catch(e => active && setError(friendlyError(e))); return () => { active = false; }; }, []);
  const clients = profiles.map(p => ({ id: p.id, name: `${p.first_name} ${p.last_name}`, phone: p.phone, visits: appointments.filter(a => a.client_id === p.id) }));
  for (const a of appointments.filter(a => !a.client_id)) { const existing = clients.find(c => c.id === `manual-${a.client_phone}`); if (existing) existing.visits.push(a); else clients.push({ id: `manual-${a.client_phone}`, name: a.client_name, phone: a.client_phone, visits: [a] }); }
  const visible = clients.filter(c => matchesSearch(`${c.name} ${c.phone}`,search));
  return <section className="page-section"><div className="page-title"><div><span className="eyebrow">Clienții salonului</span><h1>Clienții tăi</h1></div><span className="count-pill"><Users size={16}/>{clients.length} clienți</span></div><SearchField value={search} onChange={setSearch} label="Caută client" placeholder="Caută după nume sau telefon"/>{error && <p className="error-box" role="alert">{error}</p>}<div className="clients-list">{visible.map(c => { const completed = c.visits.filter(a => a.status === 'completed'); const latest = [...completed].sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0]; return <article className="client-card panel" key={c.id}><div className="client-avatar">{c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div><div><h3>{c.name}</h3><p>{latest ? `Ultima vizită: ${prettyDate(latest.starts_at)}` : 'Încă nicio vizită finalizată'}</p><span className="muted text-small">{completed.length} vizite · {money(completed.reduce((n, a) => n + a.price_cents, 0))}</span></div><a className="secondary" href={`tel:${c.phone}`} aria-label={`Sună ${c.name}`}><Phone size={16}/><span>{c.phone}</span></a></article>; })}</div>{!visible.length && <div className="empty panel"><Users/><h3>Niciun client găsit.</h3><p>Încearcă alt nume sau alt număr de telefon.</p></div>}</section>;
}
