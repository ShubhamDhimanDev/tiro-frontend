import type { BookingRecord } from "./types";

/**
 * sessionStorage key for the display cache of the active booking. It is only
 * ever a cache: `components/booking/booking-flow.tsx` asks the server for the
 * authoritative state on load. The order page writes it before sending a
 * customer to "Manage booking", so the existing reschedule/cancel UI opens on
 * their booking.
 */
export const HOLD_STORAGE_KEY = "mts_active_booking_hold";

export function writeStoredHold(record: BookingRecord): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(HOLD_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage full or blocked: the manage page falls back to "no booking found".
  }
}

/** Reads the display cache of the active booking hold, or `null`. */
export function readStoredHold(): BookingRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(HOLD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BookingRecord;
    return typeof parsed.id === "number" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearStoredHold(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(HOLD_STORAGE_KEY);
  } catch {
    // Ignore: display cache only.
  }
}
