import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { matchesSearch } from '../lib/search';
import { Check, ChevronDown, Search } from 'lucide-react';

type Option = { value: string; label: string; disabled: boolean };
type Props = { value: string; onValueChange: (value: string) => void; children: ReactNode; disabled?: boolean; 'aria-label'?: string; name?: string };
function text(children: ReactNode): string { return Children.toArray(children).map(child => typeof child === 'string' || typeof child === 'number' ? String(child) : isValidElement<{children?: ReactNode}>(child) ? text(child.props.children) : '').join(''); }
export function Select({ value, onValueChange, children, disabled = false, 'aria-label': label, name }: Props) {
  const options: Option[] = Children.toArray(children).flatMap(child => isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child) ? [{ value: String(child.props.value ?? text(child.props.children)), label: text(child.props.children), disabled: !!child.props.disabled }] : []);
  const selected = Math.max(0, options.findIndex(o => o.value === value));
  const [query,setQuery] = useState('');
  const visible = options.map((option,index)=>({...option,index})).filter(o=>matchesSearch(o.label,query));
  const [open, setOpen] = useState(false); const [active, setActive] = useState(selected); const [height, setHeight] = useState(280);
  const root = useRef<HTMLSpanElement>(null); const button = useRef<HTMLButtonElement>(null); const list = useRef<HTMLDivElement>(null); const id = useId();
  function choose(index: number) { const option = options[index]; if (!option || option.disabled) return; onValueChange(option.value); setOpen(false); button.current?.focus({preventScroll:true}); }
  function toggle() { if (disabled) return; setQuery(''); setActive(selected); setOpen(current => !current); }
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    const resize = () => { const bottom = button.current?.getBoundingClientRect().bottom ?? 0; setHeight(Math.min(290, Math.max(140, window.innerHeight - bottom - 25))); };
    resize(); window.addEventListener('resize', resize);
    return () => { document.removeEventListener('pointerdown', close); window.removeEventListener('resize', resize); };
  }, [open]);
  useLayoutEffect(() => {
    if (!open || !list.current) return;
    const option = list.current.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!option) return;
    const parent=list.current, top=option.offsetTop, bottom=top+option.offsetHeight;
    if(top<parent.scrollTop)parent.scrollTop=top;
    else if(bottom>parent.scrollTop+parent.clientHeight)parent.scrollTop=bottom-parent.clientHeight;
  }, [open, active]);
  function keys(e: KeyboardEvent<HTMLElement>, searching = false) {
    if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); button.current?.focus({preventScroll:true}); return; }
    if (e.key === 'Tab') { setOpen(false); return; }
    const enabled=visible.filter(o=>!o.disabled);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      if (!open) { setQuery(''); setActive(selected); setOpen(true); return; }
      if (!enabled.length) return;
      const current=enabled.findIndex(o=>o.index===active);
      const next=e.key==='Home'?0:e.key==='End'?enabled.length-1:Math.max(0,Math.min(enabled.length-1,current+(e.key==='ArrowUp'?-1:1)));
      setActive(enabled[next].index); return;
    }
    if ((e.key === 'Enter' || (!searching && e.key === ' ')) && open) {
      e.preventDefault();const option=enabled.find(o=>o.index===active)??enabled[0];if(option)choose(option.index);
    }
  }
  return <span ref={root} className={`select-shell${disabled ? ' is-disabled' : ''}${open ? ' is-open' : ''}`}>
    {name && <input type="hidden" name={name} value={value}/>}
    <button ref={button} type="button" className="select-control" role="combobox" aria-label={label} aria-expanded={open} aria-haspopup="listbox" aria-controls={`${id}-options`} aria-activedescendant={open ? `${id}-${active}` : undefined} disabled={disabled} onKeyDown={keys} onClick={e => { e.preventDefault(); e.stopPropagation(); toggle(); }}><span>{options[selected]?.label}</span><ChevronDown className="select-chevron" size={20} strokeWidth={1.8} aria-hidden="true"/></button>
    {open && <div ref={list} className="select-options" id={`${id}-options`} role="listbox" aria-label={label ?? 'Opțiuni'} style={{ maxHeight: height }}>{options.length>12&&<div className="select-search"><Search size={16}/><input aria-label={`Caută în ${label ?? 'opțiuni'}`} placeholder="Caută…" value={query} onInput={e=>setQuery(e.currentTarget.value)} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>keys(e,true)}/></div>}{!visible.length&&<p className="select-empty">Niciun rezultat.</p>}{visible.map(({index,...option}) => <div id={`${id}-${index}`} key={option.value} role="option" data-index={index} aria-selected={option.value === value} aria-disabled={option.disabled} className={`select-option${index === active ? ' is-active' : ''}${option.value === value ? ' is-selected' : ''}`} onPointerDown={e => e.preventDefault()} onMouseMove={() => !option.disabled && setActive(index)} onClick={e => { e.preventDefault(); e.stopPropagation(); choose(index); }}><span>{option.label}</span>{option.value === value && <Check size={19} aria-hidden="true"/>}</div>)}</div>}
  </span>;
}
