import type { BookingDay } from "@/lib/booking/types";

export interface NextSlot {
  date: string;
  start: string;
  end: string;
}

/** First bookable slot across `days` (in date order), or `null` when every day is empty. */
export function findNextSlot(days: BookingDay[]): NextSlot | null {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  for (const day of sorted) {
    const slot = day.slots[0];
    if (slot) return { date: day.date, start: slot.start, end: slot.end };
  }
  return null;
}

/** `"08:00"` -> `"8am"`, `"14:30"` -> `"2:30pm"`. Anything else is returned unchanged. */
export function formatSlotTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? "pm" : "am";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === "00" ? `${h12}${suffix}` : `${h12}:${minutes}${suffix}`;
}

/** `"2026-10-01"` -> `"Today"` / `"Tomorrow"` / `"Thu 1 Oct"`, judged against `todayIso` (also `YYYY-MM-DD`). */
export function formatSlotDay(dateIso: string, todayIso: string): string {
  if (dateIso === todayIso) return "Today";
  const day = new Date(`${dateIso}T00:00:00Z`);
  const today = new Date(`${todayIso}T00:00:00Z`);
  if (Number.isNaN(day.getTime()) || Number.isNaN(today.getTime())) return dateIso;
  if (day.getTime() - today.getTime() === 86_400_000) return "Tomorrow";
  return new Intl.DateTimeFormat("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(day)
    .replace(",", "");
}

export function describeNextSlot(slot: NextSlot, todayIso: string): string {
  return `${formatSlotDay(slot.date, todayIso)}, ${formatSlotTime(slot.start)} to ${formatSlotTime(slot.end)}`;
}
