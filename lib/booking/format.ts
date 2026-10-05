/**
 * Display helpers for appointment dates and times. The booking API returns
 * 24-hour "HH:MM" strings and "YYYY-MM-DD" dates; customers read "9:00 am" and
 * "Fri 25 Sep". Pure functions so they can be unit tested.
 */

/** "09:00" -> "9:00 am", "14:30" -> "2:30 pm". Unrecognised input is returned as-is. */
export function formatClock(hhmm: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!match) return hhmm;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (hours > 23) return hhmm;
  const suffix = hours >= 12 ? "pm" : "am";
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelve}:${minutes} ${suffix}`;
}

function meridiem(hhmm: string): "am" | "pm" | null {
  const match = /^(\d{1,2}):/.exec(hhmm);
  if (!match) return null;
  return Number(match[1]) >= 12 ? "pm" : "am";
}

/** "09:00","09:52" -> "9:00 – 9:52 am"; crossing noon keeps both suffixes. */
export function formatWindow(start: string, end: string): string {
  const startText = formatClock(start);
  const endText = formatClock(end);
  if (meridiem(start) !== null && meridiem(start) === meridiem(end)) {
    return `${startText.replace(/ (am|pm)$/, "")} – ${endText}`;
  }
  return `${startText} – ${endText}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDate(date: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;
  // Noon local: immune to DST edges when only the calendar day matters.
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
}

/** "2026-09-25" -> "Fri 25 Sep" (short) or "Friday 25 September 2026" (long). */
export function formatDay(date: string, style: "short" | "long" = "short"): string {
  const parsed = parseDate(date);
  if (!parsed) return date;
  if (style === "long") {
    return parsed.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  // Fixed abbreviations: newer ICU data spells September "Sept" in en-AU.
  return `${WEEKDAYS[parsed.getDay()]} ${parsed.getDate()} ${MONTHS[parsed.getMonth()]}`;
}

/** Parts for a date-strip tile: weekday, day of month and month. */
export function dayParts(date: string): { weekday: string; day: string; month: string } {
  const parsed = parseDate(date);
  if (!parsed) return { weekday: "", day: date, month: "" };
  return {
    weekday: WEEKDAYS[parsed.getDay()],
    day: String(parsed.getDate()),
    month: MONTHS[parsed.getMonth()],
  };
}

/** "morning" before 12:00, otherwise "afternoon". */
export function partOfDay(hhmm: string): "morning" | "afternoon" {
  return meridiem(hhmm) === "pm" ? "afternoon" : "morning";
}
