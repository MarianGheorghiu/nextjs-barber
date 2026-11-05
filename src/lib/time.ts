export const ZONE = 'Europe/Bucharest';
export function dateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function addDays(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function weekday(key: string): number { return new Date(`${key}T12:00:00Z`).getUTCDay(); }
export function clock(value: string): string { return new Intl.DateTimeFormat('ro-RO', { timeZone: ZONE, hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
export function prettyDate(value: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('ro-RO', { timeZone: ZONE, day: 'numeric', month: 'long', ...options }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
}
export function money(cents: number): string { return `${new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(cents / 100)} lei`; }
export function minutes(value: string): number { const [h, m] = value.split(':').map(Number); return h * 60 + m; }
// Converts a local salon time through the zone's actual offset, including DST.
export function atSalon(key: string, time: string): string {
  const wall = Date.parse(`${key}T${time}:00Z`);
  let stamp = wall;
  const format = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(format.formatToParts(new Date(stamp)).map(p => [p.type, p.value]));
    const represented = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
    stamp += wall - represented;
  }
  return new Date(stamp).toISOString();
}
export function overlaps(start: string, end: string, otherStart: string, otherEnd: string): boolean {
  return Date.parse(start) < Date.parse(otherEnd) && Date.parse(end) > Date.parse(otherStart);
}
export function canCancel(startsAt: string, hours: number, now = Date.now()): boolean { return Date.parse(startsAt) >= now + hours * 3600000; }
