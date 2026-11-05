import { Select } from './Select';

const times = Array.from({ length: 24 * 12 }, (_, i) => `${String(Math.floor(i / 12)).padStart(2, '0')}:${String((i % 12) * 5).padStart(2, '0')}`);
export function TimeSelect({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const selected = value.slice(0, 5);
  // Retain existing minute precision when editing a previously saved schedule.
  const options = selected && !times.includes(selected) ? [...times, selected].sort() : times;
  return <Select aria-label={label} value={selected} onValueChange={onChange} disabled={disabled}>
    {!selected && <option value="" disabled>Alege ora</option>}
    {options.map(time => <option key={time} value={time}>{time}</option>)}
  </Select>;
}
