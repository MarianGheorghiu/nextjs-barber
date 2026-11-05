import type { CalendarPolicy, DayOff, Schedule } from './types';
import { addDays, weekday } from './time.ts';
export type HolidayRule = { id: string; name: string; group: 'legal' | 'orthodox'; monthDay?: string; easterOffset?: number };
// Calendar policy for the salon, editable by Cristi. No substitute/moved days are inferred.
// Sources: Code of Labour art.139 and doxologia.ro/calendar-ortodox/2026MM.
// Additional local patronal feasts can be entered as individual days off.
export const HOLIDAY_RULES: HolidayRule[] = [
  {id:'new-year',name:'Anul Nou',group:'legal',monthDay:'01-01'},
  {id:'new-year-2',name:'A doua zi de Anul Nou',group:'legal',monthDay:'01-02'},
  {id:'epiphany',name:'Boboteaza',group:'legal',monthDay:'01-06'},
  {id:'saint-john',name:'Sfântul Ioan',group:'legal',monthDay:'01-07'},
  {id:'union',name:'Unirea Principatelor',group:'legal',monthDay:'01-24'},
  {id:'good-friday',name:'Vinerea Mare',group:'legal',easterOffset:-2},
  {id:'easter',name:'Paștele ortodox',group:'legal',easterOffset:0},
  {id:'easter-monday',name:'A doua zi de Paște',group:'legal',easterOffset:1},
  {id:'labour',name:'1 Mai',group:'legal',monthDay:'05-01'},
  {id:'children',name:'Ziua Copilului',group:'legal',monthDay:'06-01'},
  {id:'pentecost',name:'Rusaliile',group:'legal',easterOffset:49},
  {id:'pentecost-monday',name:'A doua zi de Rusalii',group:'legal',easterOffset:50},
  {id:'assumption',name:'Adormirea Maicii Domnului',group:'legal',monthDay:'08-15'},
  {id:'andrew',name:'Sfântul Andrei',group:'legal',monthDay:'11-30'},
  {id:'national',name:'Ziua Națională',group:'legal',monthDay:'12-01'},
  {id:'christmas',name:'Crăciunul',group:'legal',monthDay:'12-25'},
  {id:'christmas-2',name:'A doua zi de Crăciun',group:'legal',monthDay:'12-26'},
  {id:'three-hierarchs',name:'Sfinții Trei Ierarhi',group:'orthodox',monthDay:'01-30'},
  {id:'meeting',name:'Întâmpinarea Domnului',group:'orthodox',monthDay:'02-02'},
  {id:'annunciation',name:'Buna Vestire',group:'orthodox',monthDay:'03-25'},
  {id:'palm-sunday',name:'Floriile',group:'orthodox',easterOffset:-7},
  {id:'bright-friday',name:'Izvorul Tămăduirii',group:'orthodox',easterOffset:5},
  {id:'george',name:'Sfântul Gheorghe',group:'orthodox',monthDay:'04-23'},
  {id:'ascension',name:'Înălțarea Domnului',group:'orthodox',easterOffset:39},
  {id:'constantine',name:'Sfinții Constantin și Elena',group:'orthodox',monthDay:'05-21'},
  {id:'john-birth',name:'Nașterea Sfântului Ioan Botezătorul',group:'orthodox',monthDay:'06-24'},
  {id:'peter-paul',name:'Sfinții Petru și Pavel',group:'orthodox',monthDay:'06-29'},
  {id:'elijah',name:'Sfântul Proroc Ilie',group:'orthodox',monthDay:'07-20'},
  {id:'transfiguration',name:'Schimbarea la Față',group:'orthodox',monthDay:'08-06'},
  {id:'john-beheading',name:'Tăierea Capului Sfântului Ioan Botezătorul',group:'orthodox',monthDay:'08-29'},
  {id:'mary-birth',name:'Nașterea Maicii Domnului',group:'orthodox',monthDay:'09-08'},
  {id:'cross',name:'Înălțarea Sfintei Cruci',group:'orthodox',monthDay:'09-14'},
  {id:'protection',name:'Acoperământul Maicii Domnului',group:'orthodox',monthDay:'10-01'},
  {id:'paraskeva',name:'Sfânta Cuvioasă Parascheva',group:'orthodox',monthDay:'10-14'},
  {id:'demetrius',name:'Sfântul Dumitru',group:'orthodox',monthDay:'10-26'},
  {id:'demetrius-new',name:'Sfântul Cuvios Dimitrie cel Nou',group:'orthodox',monthDay:'10-27'},
  {id:'archangels',name:'Sfinții Mihail și Gavriil',group:'orthodox',monthDay:'11-08'},
  {id:'mary-entry',name:'Intrarea Maicii Domnului în Biserică',group:'orthodox',monthDay:'11-21'},
  {id:'nicholas',name:'Sfântul Nicolae',group:'orthodox',monthDay:'12-06'},
  {id:'stephen',name:'Sfântul Ștefan',group:'orthodox',monthDay:'12-27'},
];
export const DEFAULT_CALENDAR_POLICY: CalendarPolicy = { closedHolidayIds: HOLIDAY_RULES.map(h => h.id) };
export function orthodoxEaster(year: number): string {
  const a=year%4,b=year%7,c=year%19,d=(19*c+15)%30,e=(2*a+4*b-d+34)%7;
  const month=Math.floor((d+e+114)/31),day=(d+e+114)%31+1;
  const julianLabel=new Date(Date.UTC(year,month-1,day)).toISOString().slice(0,10);
  return addDays(julianLabel,Math.floor(year/100)-Math.floor(year/400)-2);
}
export function holidayDate(rule: HolidayRule, year: number): string { return rule.monthDay ? `${year}-${rule.monthDay}` : addDays(orthodoxEaster(year), rule.easterOffset!); }
export function holidayReason(day: string, policy: CalendarPolicy): string | undefined {
  const year=Number(day.slice(0,4));
  return HOLIDAY_RULES.filter(rule=>policy.closedHolidayIds.includes(rule.id)&&holidayDate(rule,year)===day).map(rule=>rule.name).join(' / ') || undefined;
}
export function openDay(day: string, schedule: Schedule[], daysOff: Pick<DayOff,'date'>[], policy: CalendarPolicy): boolean {
  return !!schedule.find(s=>s.weekday===weekday(day))?.enabled && !daysOff.some(d=>d.date===day) && !holidayReason(day,policy);
}

// A closed day is never a destination for the barber's agenda arrows.
export function findOpenDay(from:string, direction:1|-1, schedule:Schedule[], daysOff:Pick<DayOff,'date'>[], policy:CalendarPolicy):string|null {
  if(!schedule.some(h=>h.enabled))return null;
  for(let n=0, day=from;n<366;n++,day=addDays(day,direction))if(openDay(day,schedule,daysOff,policy))return day;
  return null;
}
