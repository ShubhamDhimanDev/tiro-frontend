import { formatClock, formatDay, formatWindow } from "@/lib/booking/format";
import type { BookingDay, BookingRecord, BookingSlot } from "@/lib/booking/types";

/**
 * Presentation helpers over the live `GET /booking-slots` response. The API
 * returns real slot start/end times; the design groups them into Morning,
 * Lunch and Afternoon. Nothing here invents availability: a day with no slots
 * is unavailable, and "slots left" is the real count.
 */

export type DayPart = "morning" | "lunch" | "afternoon";

export const DAY_PARTS: { key: DayPart; label: string }[] = [
  { key: "morning", label: "Morning" },
  { key: "lunch", label: "Lunch" },
  { key: "afternoon", label: "Afternoon" },
];

/** Before 11:00 is morning, 11:00 to 13:59 lunch, 14:00 onwards afternoon. */
export function dayPartOf(hhmm: string): DayPart {
  const hour = Number(/^(\d{1,2}):/.exec(hhmm)?.[1] ?? 0);
  if (hour < 11) return "morning";
  if (hour < 14) return "lunch";
  return "afternoon";
}

export function groupSlots(slots: BookingSlot[]): Record<DayPart, BookingSlot[]> {
  const out: Record<DayPart, BookingSlot[]> = { morning: [], lunch: [], afternoon: [] };
  for (const slot of slots) out[dayPartOf(slot.start)].push(slot);
  return out;
}

export interface DayAvailability {
  slots: BookingSlot[];
  /** True when at least one real slot is free. */
  open: boolean;
  /** Green dot: the flexible discount can be taken on this day. */
  flexible: { window_start: string; window_end: string } | null;
  /** Red dot: exactly one slot is left. */
  lastSlot: boolean;
}

export function dayAvailability(day: BookingDay | undefined): DayAvailability {
  const slots = day?.slots ?? [];
  const f = day?.flexible;
  return {
    slots,
    open: slots.length > 0,
    flexible: f?.available && f.window_start && f.window_end ? { window_start: f.window_start, window_end: f.window_end } : null,
    lastSlot: slots.length === 1,
  };
}

/**
 * "1 slot left" / "3 slots left" while a day is nearly full, "12 times available"
 * otherwise. The API's count is of distinct bookable start times on a 15 minute
 * grid, not of technician jobs, so a big number is described as availability
 * rather than as stock running out.
 */
export function slotsLeftLabel(count: number): string {
  if (count > 3) return `${count} times available`;
  return `${count} ${count === 1 ? "slot" : "slots"} left`;
}

/** Day and time lines for a held booking: a flexible one shows the window the customer agreed to. */
export function describeHold(record: BookingRecord): { day: string; time: string } {
  const day = formatDay(record.scheduled_date, "long");
  if (record.flexible && record.flexible_window) {
    return { day, time: `Flexible: any time between ${formatClock(record.flexible_window.start)} and ${formatClock(record.flexible_window.end)}` };
  }
  return { day, time: formatWindow(record.slot_start, record.slot_end) };
}
