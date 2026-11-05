import { AlertCircle, Phone } from 'lucide-react';
import type { ClosurePreview } from '../lib/time-off';
import { clock, prettyDate } from '../lib/time';

export function ClosureReview({ preview }: { preview: ClosurePreview }) {
  return <>
    <div className="info-box"><strong>{preview.appointments.length ? preview.appointments.length===1?'O programare va fi anulată.':`${preview.appointments.length} programări vor fi anulate.` : 'Nu există programări afectate.'}</strong><p>Clienții cu cont vor găsi notificarea de anulare în cont. Rezervările rămân în istoric. Nu se trimit emailuri, SMS sau push în previzualizarea locală.</p></div>
    {!!preview.appointments.length && <div className="closure-preview">{preview.appointments.map(a => <article key={a.id}><div><h3>{a.client_name}</h3><p>{prettyDate(a.starts_at)} · {clock(a.starts_at)} · {a.service_name}</p>{!a.client_id && <a href={`tel:${a.client_phone}`}><Phone size={15}/>{a.client_phone} — de contactat telefonic</a>}</div><span className="status status-cancelled">Se anulează</span></article>)}</div>}
    {!!preview.manual.length && <p className="manual-warning"><AlertCircle size={19}/>{preview.manual.length===1?'Un client fără cont trebuie contactat telefonic.':`${preview.manual.length} clienți fără cont trebuie contactați telefonic.`} Păstrează datele de contact înainte de confirmare; le găsești și în istoricul programărilor anulate.</p>}
  </>;
}
