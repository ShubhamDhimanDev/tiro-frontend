/**
 * Pure calendar helpers for the fitting date strip. Dates are `YYYY-MM-DD`
 * strings (the booking API's format); arithmetic is done in UTC so it never
 * shifts across a daylight-saving change.
 */

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function format(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return format(d);
}

/** Local calendar date as `YYYY-MM-DD`. Call on the client only. */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export interface DayCell {
  iso: string;
  dow: string;
  day: number;
  month: string;
}

/** The seven calendar cells starting at `startIso`. */
export function weekCells(startIso: string): DayCell[] {
  return Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(startIso, i);
    const d = parse(iso);
    return { iso, dow: DOW[d.getUTCDay()], day: d.getUTCDate(), month: MONTHS[d.getUTCMonth()] };
  });
}

/** "Thursday, 1 Oct". */
export function describeDay(iso: string): string {
  const d = parse(iso);
  return `${DOW_LONG[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
