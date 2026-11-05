import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, dateKey, prettyDate, weekday } from '../lib/time';

type Props = { value: string; onChange: (day: string) => void; label: string; min?: string; max?: string; disabled?: boolean; isDayEnabled?: (day: string) => boolean };
export function DatePicker({ value, onChange, label, min, max, disabled, isDayEnabled }: Props) {
  const [open,setOpen] = useState(false);
  const [month,setMonth] = useState((value || min || dateKey()).slice(0,7));
  const [left,setLeft] = useState(0);
  const [focusDay,setFocusDay] = useState(value || min || dateKey());
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const id=useId();
  const allowed=(day:string) => (!min || day>=min) && (!max || day<=max) && (!isDayEnabled || isDayEnabled(day));
  const first=`${month}-01`;
  const offset=(weekday(first)+6)%7;
  const start=addDays(first,-offset);
  const monthEnd=new Date(`${first}T12:00:00Z`);monthEnd.setUTCMonth(monthEnd.getUTCMonth()+1,0);
  const cells=Math.ceil((offset+monthEnd.getUTCDate())/7)*7;
  const shiftMonth=(direction:number) => { const d=new Date(`${first}T12:00:00Z`);d.setUTCMonth(d.getUTCMonth()+direction);return d.toISOString().slice(0,7); };
  useEffect(()=>{
    if(!open)return;
    const close=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};
    document.addEventListener('pointerdown',close);
    return()=>document.removeEventListener('pointerdown',close);
  },[open]);
  useLayoutEffect(()=>{
    if(!open)return;
    const place=()=>{const r=root.current?.getBoundingClientRect();if(!r)return;const width=Math.min(264,window.innerWidth-32);const centered=(r.width-width)/2;setLeft(Math.max(16-r.left,Math.min(centered,window.innerWidth-16-r.left-width)));};
    place();window.addEventListener('resize',place);return()=>window.removeEventListener('resize',place);
  },[open]);
  useEffect(()=>{if(open)panel.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus({preventScroll:true});},[open,month,focusDay]);
  function choose(day:string){if(!allowed(day))return;onChange(day);setOpen(false);trigger.current?.focus({preventScroll:true});}
  return <div ref={root} className={`date-picker${open?' is-open':''}`} onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);trigger.current?.focus({preventScroll:true});}}}>
    <button type="button" ref={trigger} className="date-picker-trigger" aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={open?id:undefined} disabled={disabled} onClick={()=>{if(!open){const day=value||min||dateKey();setMonth(day.slice(0,7));setFocusDay(day);}setOpen(v=>!v);}}><CalendarDays size={18}/><span>{value?prettyDate(value,{year:'numeric'}):'Alege ziua'}</span><ChevronRight size={16}/></button>
    {open&&<div ref={panel} id={id} className="date-picker-panel" role="dialog" aria-label={`Calendar: ${label}`} style={{left}}>
      <div className="calendar-heading"><button type="button" className="calendar-arrow" aria-label="Luna anterioară" disabled={!!min&&shiftMonth(-1)<min.slice(0,7)} onClick={()=>setMonth(shiftMonth(-1))}><ChevronLeft size={19}/></button><strong aria-live="polite">{prettyDate(first,{month:'long',year:'numeric',day:undefined})}</strong><button type="button" className="calendar-arrow" aria-label="Luna următoare" disabled={!!max&&shiftMonth(1)>max.slice(0,7)} onClick={()=>setMonth(shiftMonth(1))}><ChevronRight size={19}/></button></div>
      <div className="calendar-weekdays" aria-hidden="true">{['Lu','Ma','Mi','Jo','Vi','Sâ','Du'].map(d=><span key={d}>{d}</span>)}</div>
      <div className="calendar-grid">{Array.from({length:cells},(_,i)=>addDays(start,i)).map(day=><button key={day} type="button" data-day={day} disabled={!allowed(day)} aria-label={prettyDate(day,{weekday:'long',year:'numeric'})} aria-pressed={value===day} aria-current={day===dateKey()?'date':undefined} className={`${day.slice(0,7)!==month?'outside-month ':''}${day===value?'selected':''}`} onClick={()=>choose(day)} onKeyDown={e=>{const offset:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};if(e.key in offset){e.preventDefault();let next=addDays(day,offset[e.key]);for(let n=0;n<366&&!allowed(next);n++)next=addDays(next,offset[e.key]>0?1:-1);if(allowed(next)){setFocusDay(next);setMonth(next.slice(0,7));}}}}>{Number(day.slice(8))}</button>)}</div>
      <div className="calendar-footer"><button type="button" className="text-button" disabled={!allowed(dateKey())} onClick={()=>choose(dateKey())}>Astăzi</button><button type="button" className="text-button" onClick={()=>{setOpen(false);trigger.current?.focus({preventScroll:true});}}>Închide</button></div>
    </div>}
  </div>;
}
