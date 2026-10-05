import type { BookingBackend } from "./backend-client";
import type {
  BackendResponse,
  BookingAddonKey,
  BookingCreateInput,
  BookingCreateRecord,
  BookingItemInput,
  BookingRecord,
  BookingRescheduleInput,
  BookingStatus,
} from "./types";

/**
 * In-memory dev/test stub for `/api/v1/booking-slots` and
 * `/api/v1/bookings*`, opt-in via `BOOKING_BACKEND=stub` — see `backend.ts`
 * for why live is the default. Good enough to exercise the whole
 * pick-slot -> hold -> reschedule/cancel UI end-to-end without a running
 * Laravel process; deliberately does NOT replicate the real
 * technician/van eligibility or capacity-cap algorithm
 * (docs/architecture/04-booking-capacity-engine.md) — that's a genuinely
 * backend concern, not something worth faking precisely here. What it does
 * replicate, because the UI depends on being able to exercise these paths:
 *  - every requested date represented in `days`, even with `slots: []`
 *  - the 14-day range cap (422)
 *  - one booking per exact `date`+`slot_start` (a crude stand-in for real
 *    capacity), so a concurrent double-book is reproducible as a real `409`
 *  - the 15-minute hold TTL and `manage_token` issuance for guest bookings
 *  - idempotency-key replay returning the original `201` body unchanged
 *  - the guest `X-Booking-Manage-Token` / authenticated-owner auth split on
 *    reschedule/cancel/show, `403` otherwise
 *  - the permissive/zero `cancellation_fee_amount` default
 *  - `GET /bookings/{id}` (added 2026-09-21) reporting authoritative state,
 *    including a lazily-computed `expired` status once `hold_expires_at`
 *    has passed — this stub has no background TTL-sweep job, so it derives
 *    "expired" on read instead, same externally-observable effect
 *  - `manage_token_issued` always present (true/false) on `create()`
 *    responses only, never on reschedule/cancel/show
 *
 * Out of scope for this stub: network/rate-limit failure paths, the
 * `Idempotency` middleware's own UUID format check (this app's own
 * `/api/booking` route handler always forwards whatever it's given, same as
 * the live client), and the real slot granularity/technician calendars.
 */

const HOLD_TTL_MINUTES = 15;
const MAX_RANGE_DAYS = 14;
const SLOT_UNAVAILABLE_MESSAGE = "This slot is no longer available, please choose another.";
const DAY_START_MINUTES = 9 * 60;
const DAY_END_MINUTES = 17 * 60;
const SLOT_STEP_MINUTES = 30;
/** Phase 6a flexible option: same shape and default as the real API ($10). */
const FLEX_DISCOUNT_CENTS = 1000;
const FLEX_WINDOW = { start: "08:00", end: "18:00" };

interface StubBooking {
  id: number;
  status: "pending_hold" | "confirmed" | "cancelled";
  scheduled_date: string;
  slot_start: string;
  slot_end: string;
  duration_minutes: number;
  hold_expires_at: string | null;
  manageToken: string | null;
  isGuest: boolean;
  idempotencyKey: string;
  cancellation_fee_amount: number | null;
  flexible: boolean;
  promo_code: string | null;
}

const bookings = new Map<number, StubBooking>();
const byIdempotencyKey = new Map<string, number>();
let nextId = 5000;

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function minutesToTime(totalMinutes: number): string {
  return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

/**
 * Dev-only guess, not the real duration formula from
 * docs/architecture/04-booking-capacity-engine.md — this stub only needs a
 * duration that's stable and >0 to exercise the UI, not a correct one.
 */
function computeDuration(items: BookingItemInput[], addons: BookingAddonKey[]): number {
  const baseMinutes = 20;
  const perTyreMinutes = 13;
  const tyreCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const alignmentMinutes = addons.includes("alignment") ? 20 : 0;
  return baseMinutes + tyreCount * perTyreMinutes + alignmentMinutes;
}

function isSunday(dateStr: string): boolean {
  return parseDate(dateStr).getUTCDay() === 0;
}

/**
 * This stub has no background TTL-sweep job (`ReleaseExpiredBookingHold` is
 * real-backend-only). Deriving `expired` lazily on read has the same
 * externally-observable effect for exercising `GET /bookings/{id}` — a
 * `pending_hold` past its `hold_expires_at` reads as `expired` without this
 * stub needing a timer of its own.
 */
function effectiveStatus(booking: StubBooking): BookingStatus {
  if (booking.status === "pending_hold" && booking.hold_expires_at && new Date(booking.hold_expires_at).getTime() <= Date.now()) {
    return "expired";
  }
  return booking.status;
}

/** Mirrors `BookingController::RESCHEDULABLE_STATUSES` — evaluated against `effectiveStatus()`, not the raw stored status, so a lazily-expired hold is correctly blocked too. */
function isReschedulable(booking: StubBooking): boolean {
  const status = effectiveStatus(booking);
  return status === "pending_hold" || status === "confirmed";
}

function isSlotTaken(date: string, start: string, excludeBookingId?: number): boolean {
  for (const booking of bookings.values()) {
    if (booking.id === excludeBookingId) continue;
    if (booking.status === "cancelled") continue;
    if (booking.scheduled_date === date && booking.slot_start === start) return true;
  }
  return false;
}

function candidateSlots(date: string, durationMinutes: number, excludeBookingId?: number): { start: string; end: string }[] {
  if (isSunday(date)) return [];
  const slots: { start: string; end: string }[] = [];
  for (let minutes = DAY_START_MINUTES; minutes + durationMinutes <= DAY_END_MINUTES; minutes += SLOT_STEP_MINUTES) {
    const start = minutesToTime(minutes);
    if (isSlotTaken(date, start, excludeBookingId)) continue;
    slots.push({ start, end: minutesToTime(minutes + durationMinutes) });
  }
  return slots;
}

function toRecord(booking: StubBooking, includeFee: boolean): BookingRecord {
  return {
    id: booking.id,
    status: effectiveStatus(booking),
    scheduled_date: booking.scheduled_date,
    slot_start: booking.slot_start,
    slot_end: booking.slot_end,
    duration_minutes: booking.duration_minutes,
    hold_expires_at: booking.hold_expires_at,
    flexible: booking.flexible,
    flexible_window: booking.flexible ? FLEX_WINDOW : null,
    promo_code: booking.promo_code,
    ...(includeFee ? { cancellation_fee_amount: booking.cancellation_fee_amount } : {}),
  };
}

/**
 * `create()`-response-only shape — see `BookingCreateRecord`'s doc comment
 * in `types.ts`. `manage_token_issued` mirrors `isGuest` unconditionally
 * (same as the real backend's `manage_token_hash !== null` check);
 * `manage_token` itself is populated whenever it's still held in memory —
 * this stub has no separate secret-forgetting TTL to simulate the real
 * backend's "issued but no longer retrievable" replay edge case, so that
 * combination (`manage_token_issued: true, manage_token: undefined`) never
 * actually occurs here, only in the real `manage_token_issued` doc comment.
 */
function toCreateRecord(booking: StubBooking): BookingCreateRecord {
  const record: BookingCreateRecord = { ...toRecord(booking, false), manage_token_issued: booking.isGuest };
  if (booking.isGuest && booking.manageToken) record.manage_token = booking.manageToken;
  return record;
}

function checkAuth(
  booking: StubBooking,
  opts: { token?: string | null; manageToken?: string | null }
): BackendResponse<unknown> | null {
  if (opts.token) {
    // Stub simplification: any bearer token "owns" a non-guest booking (the
    // real backend checks `customer_id` against the resolved customer via
    // `BookingPolicy`) — good enough for exercising the UI's auth branching,
    // not a real authorization check.
    if (booking.isGuest) return { status: 403, body: { message: "You don't have permission to manage this booking." } };
    return null;
  }
  if (opts.manageToken && booking.manageToken === opts.manageToken) return null;
  return { status: 403, body: { message: "You don't have permission to manage this booking." } };
}

export const stubBookingBackend: BookingBackend = {
  async slots(zone, dateFrom, dateTo, items, addons) {
    const zoneId = Number(zone);
    if (!zone || Number.isNaN(zoneId) || zoneId <= 0) {
      return { status: 404, body: { message: "Service zone not found." } };
    }
    if (!dateFrom || !dateTo) {
      return {
        status: 422,
        body: { message: "The given data was invalid.", errors: { date_from: ["The date from field is required."] } },
      };
    }

    const from = parseDate(dateFrom);
    const to = parseDate(dateTo);
    const rangeDays = Math.round((to.getTime() - from.getTime()) / 86_400_000);
    if (rangeDays > MAX_RANGE_DAYS) {
      return {
        status: 422,
        body: {
          message: "The given data was invalid.",
          errors: { date_to: [`The date range cannot exceed ${MAX_RANGE_DAYS} days.`] },
        },
      };
    }

    const durationMinutes = computeDuration(items, addons);
    const days = [];
    for (let cursor = new Date(from); cursor.getTime() <= to.getTime(); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const dateStr = toDateString(cursor);
      const daySlots = candidateSlots(dateStr, durationMinutes);
      days.push({
        date: dateStr,
        slots: daySlots,
        flexible:
          daySlots.length > 0
            ? { available: true, window_start: FLEX_WINDOW.start, window_end: FLEX_WINDOW.end }
            : { available: false, window_start: null, window_end: null },
      });
    }
    const flexible = {
      available: days.some((d) => d.flexible.available),
      discount_cents: FLEX_DISCOUNT_CENTS,
      label: `Flexible arrival: save $${FLEX_DISCOUNT_CENTS / 100}`,
    };

    return { status: 200, body: { data: { duration_minutes: durationMinutes, flexible, days } } };
  },

  async create(body: BookingCreateInput, opts: { idempotencyKey: string; token?: string | null }) {
    const existingId = byIdempotencyKey.get(opts.idempotencyKey);
    if (existingId !== undefined) {
      const existing = bookings.get(existingId);
      if (existing) {
        return { status: 201, body: { data: toCreateRecord(existing) } };
      }
    }

    const zoneId = Number(body.service_zone_id);
    if (!body.service_zone_id || Number.isNaN(zoneId) || zoneId <= 0) {
      return { status: 404, body: { message: "Service zone not found." } };
    }

    const promoCode = body.promo_code ? body.promo_code.trim().toUpperCase() : null;
    if (promoCode && promoCode !== "WELCOME10") {
      const message = "That promo code is not valid.";
      return {
        status: 422,
        body: { message, errors: { promo_code: [message] }, promo_error: { code: "promo_code_invalid", message } },
      };
    }

    let slotStart = body.slot_start;
    if (body.flexible) {
      // The server assigns the earliest free slot that day.
      const free = candidateSlots(body.scheduled_date, computeDuration(body.items, body.addons))[0];
      if (!free) return { status: 409, body: { message: SLOT_UNAVAILABLE_MESSAGE } };
      slotStart = free.start;
    } else if (!slotStart) {
      return {
        status: 422,
        body: { message: "The slot start field is required.", errors: { slot_start: ["The slot start field is required."] } },
      };
    }
    if (!slotStart || isSlotTaken(body.scheduled_date, slotStart)) {
      return { status: 409, body: { message: SLOT_UNAVAILABLE_MESSAGE } };
    }

    const durationMinutes = computeDuration(body.items, body.addons);
    const id = nextId++;
    const isGuest = !opts.token;
    const manageToken = isGuest ? `stub-manage-token-${id}-${Date.now()}` : null;

    const booking: StubBooking = {
      id,
      status: "pending_hold",
      scheduled_date: body.scheduled_date,
      slot_start: slotStart,
      slot_end: minutesToTime(timeToMinutes(slotStart) + durationMinutes),
      duration_minutes: durationMinutes,
      hold_expires_at: new Date(Date.now() + HOLD_TTL_MINUTES * 60_000).toISOString(),
      manageToken,
      isGuest,
      idempotencyKey: opts.idempotencyKey,
      cancellation_fee_amount: null,
      flexible: Boolean(body.flexible),
      promo_code: promoCode,
    };

    bookings.set(id, booking);
    byIdempotencyKey.set(opts.idempotencyKey, id);

    return { status: 201, body: { data: toCreateRecord(booking) } };
  },

  async reschedule(
    bookingId: number | string,
    body: BookingRescheduleInput,
    opts: { token?: string | null; manageToken?: string | null }
  ) {
    const booking = bookings.get(Number(bookingId));
    if (!booking) return { status: 404, body: { message: "Booking not found." } };

    const authError = checkAuth(booking, opts);
    if (authError) return authError;

    if (!isReschedulable(booking)) {
      return { status: 409, body: { message: "This booking can no longer be rescheduled." } };
    }
    if (isSlotTaken(body.scheduled_date, body.slot_start, booking.id)) {
      return { status: 409, body: { message: SLOT_UNAVAILABLE_MESSAGE } };
    }

    booking.scheduled_date = body.scheduled_date;
    booking.slot_start = body.slot_start;
    booking.slot_end = minutesToTime(timeToMinutes(body.slot_start) + booking.duration_minutes);
    // Permissive/zero seeded default everywhere, per the contract.
    booking.cancellation_fee_amount = 0;

    return { status: 200, body: { data: toRecord(booking, true) } };
  },

  async cancel(bookingId: number | string, opts: { token?: string | null; manageToken?: string | null }) {
    const booking = bookings.get(Number(bookingId));
    if (!booking) return { status: 404, body: { message: "Booking not found." } };

    const authError = checkAuth(booking, opts);
    if (authError) return authError;

    if (!isReschedulable(booking)) {
      return { status: 409, body: { message: "This booking can no longer be cancelled." } };
    }

    booking.status = "cancelled";
    booking.hold_expires_at = null;
    booking.cancellation_fee_amount = 0;

    return { status: 200, body: { data: toRecord(booking, true) } };
  },

  /**
   * `GET /bookings/{id}` (added 2026-09-21) — read-only, no side effects,
   * same dual auth as `reschedule`/`cancel`. Never includes
   * `manage_token`/`manage_token_issued` (`toRecord`, not `toCreateRecord`),
   * matching the real backend's `show()` exactly.
   */
  async show(bookingId: number | string, opts: { token?: string | null; manageToken?: string | null }) {
    const booking = bookings.get(Number(bookingId));
    if (!booking) return { status: 404, body: { message: "Booking not found." } };

    const authError = checkAuth(booking, opts);
    if (authError) return authError;

    return { status: 200, body: { data: toRecord(booking, true) } };
  },
};
