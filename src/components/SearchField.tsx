import { Search, X } from 'lucide-react';
export function SearchField({ value, onChange, label, placeholder }: { value: string; onChange: (value: string) => void; label: string; placeholder: string }) {
  return <div className="search-field"><Search size={19} aria-hidden="true"/><input type="search" aria-label={label} placeholder={placeholder} value={value} onInput={e => onChange(e.currentTarget.value)} onChange={e => onChange(e.target.value)}/>{value && <button type="button" className="search-clear" aria-label={`Șterge căutarea: ${label}`} onClick={() => onChange('')}><X size={17}/></button>}</div>;
}
