/**
 * Shared types for the booking & capacity boundary.
 *
 * Mirrors docs/architecture/02-api-contract.md's "Booking & capacity
 * endpoints" section (Phase 3, added 2026-09-18) and
 * docs/architecture/01-data-model.md's `Booking`/`BookingLineItem` fields.
 * Verified directly against the real backend this round (`BookingController`,
 * `BookingSlotController`, `StoreBookingRequest`/`BookingSlotsRequest`,
 * `ValidatesBookingCart`, `VehicleFitmentPosition`, `BookingStatus`) rather
 * than trusting the doc alone — same "independently verified against the
 * actual controller" posture `lib/vehicles/backend.ts` documents for its own
 * domain. Keep these in sync with backend-agent's contract rather than
 * inventing local variants.
 */

/** `VehicleFitmentPosition` — which axle(s) a line item's quantity is for. */
export const BOOKING_POSITIONS = ["all", "front", "rear"] as const;
export type BookingPosition = (typeof BOOKING_POSITIONS)[number];

/**
 * Customer-selectable `booking_addon` keys only — never `staggered`, which
 * the backend derives from `items`' positions, not something the frontend
 * ever sends.
 */
export const BOOKING_ADDONS = ["alignment", "locking_nuts"] as const;
export type BookingAddonKey = (typeof BOOKING_ADDONS)[number];

/** `items[]` shape shared by `booking-slots` and `POST /bookings` — mirrors `BookingLineItem`. */
export interface BookingItemInput {
  tyre_variant_id: number;
  quantity: number;
  position: BookingPosition;
}

export interface BookingSlot {
  start: string;
  end: string;
}

/** `data.flexible`: whether the flexible option is on at all, and its saving. */
export interface BookingFlexibleOffer {
  available: boolean;
  discount_cents: number;
  label: string | null;
}

/** `days[].flexible`: offered per day, with that day's window (zone operating hours). */
export interface BookingDayFlexible {
  available: boolean;
  window_start: string | null;
  window_end: string | null;
}

export interface BookingDay {
  date: string;
  /** Phase 6a. Absent from older responses and stubs: treat as not available. */
  flexible?: BookingDayFlexible;
  /** Always present, even when empty — every requested date is represented so a day with no availability renders as a disabled/empty day rather than being silently omitted. */
  slots: BookingSlot[];
}

export interface BookingSlotsData {
  duration_minutes: number;
  /** Phase 6a. Absent means not offered. */
  flexible?: BookingFlexibleOffer;
  days: BookingDay[];
}

export interface BookingSlotsResponse {
  data: BookingSlotsData;
}

/**
 * Mirrors `App\Enums\BookingStatus`. `expired` is set by the backend's TTL
 * sweep (`ReleaseExpiredBookingHold`) — `GET /api/v1/bookings/{booking}`
 * (added 2026-09-21, see `components/booking/booking-flow.tsx`'s doc
 * comment) can report it authoritatively, so this is no longer only ever
 * inferred client-side.
 */
export const BOOKING_STATUSES = [
  "pending_hold",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
  "expired",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * The base shape returned by `PATCH .../reschedule`, `POST .../cancel`, and
 * (added 2026-09-21) `GET /api/v1/bookings/{booking}` alike — the
 * read-only "current state" endpoint added specifically so a manage/status
 * view can reflect authoritative state on load/reload instead of only ever
 * trusting a cached mutation response (see
 * `components/booking/booking-flow.tsx`'s doc comment). `manage_token` is
 * stripped server-side by this app's own `POST /api/booking` Route Handler
 * before this ever reaches client JS — see `lib/booking/manage-token-cookie.ts`
 * — so it should never actually be populated on a value that reaches a React
 * component; kept optional here only so `lib/booking/backend-client.ts` and
 * the route handler itself can type the raw Laravel response honestly.
 * `manage_token`/`manage_token_issued` are deliberately absent from this
 * base shape — both are `POST /bookings`-response-only fields (see
 * `BookingCreateRecord` below); `reschedule`/`cancel`/`show` never include
 * either key at all (not present-but-null/false — entirely absent).
 */
export interface BookingRecord {
  id: number;
  status: BookingStatus;
  scheduled_date: string;
  slot_start: string;
  slot_end: string;
  duration_minutes: number;
  hold_expires_at: string | null;
  /** Phase 6a: true when the customer accepted a flexible arrival window. */
  flexible?: boolean;
  /** Phase 6a: the window the customer agreed to (zone hours that day); `null` when not flexible. */
  flexible_window?: { start: string; end: string } | null;
  /** Phase 6a: normalised (upper-case) code stored on the booking, or `null`. */
  promo_code?: string | null;
  /** Only present on reschedule/cancel/show responses, and only when the applicable `CancellationPolicy` charges one — currently zero/permissive everywhere per the seeded defaults, but must not be assumed always-null. */
  cancellation_fee_amount?: number | null;
}

export interface BookingResponse {
  data: BookingRecord;
}

/**
 * `POST /api/v1/bookings`'s response shape specifically — the only endpoint
 * that ever includes `manage_token`/`manage_token_issued`.
 *
 * `manage_token_issued` (added 2026-09-21, alongside the new `GET`
 * endpoint) is **always present** on this response (`true`/`false`, never
 * omitted) — `true` whenever the booking was created as a guest booking
 * (`manage_token_hash` set), *regardless* of whether `manage_token` itself
 * is present on this exact response. In particular, an idempotency-key
 * replay outside the 15-minute manage-token replay cache window (see
 * `Booking::manageTokenCacheTtl()`) correctly reports
 * `{ manage_token_issued: true, manage_token: undefined }` — an expected
 * outcome, not an error, and not something this app's flow should hit in
 * practice (the guest manage token is captured into the httpOnly cookie
 * synchronously on the very first `201`, well inside that window), but
 * modelled honestly rather than assumed away.
 */
export interface BookingCreateRecord extends BookingRecord {
  manage_token?: string;
  manage_token_issued: boolean;
}

export interface BookingCreateResponse {
  data: BookingCreateRecord;
}

export interface BookingCreateInput {
  /**
   * A string, not a number, matching `ServiceZoneSnapshot.zoneId`'s type
   * everywhere else in this codebase (the location cookie, `lib/catalog`'s
   * `zone` query param, etc.) — Laravel's `integer` validation rule accepts
   * numeric strings (`FILTER_VALIDATE_INT`), and `$request->integer(...)`
   * casts it server-side, so this round-trips fine without this app
   * re-parsing the zone id to a number anywhere.
   */
  service_zone_id: string;
  scheduled_date: string;
  /** Required unless `flexible` is true (the server then assigns a real slot). */
  slot_start?: string;
  /** Phase 6a: accept any window that day for the flexible discount. */
  flexible?: boolean;
  /** Phase 6a: validated now and stored on the booking. */
  promo_code?: string | null;
  items: BookingItemInput[];
  addons: BookingAddonKey[];
  vehicle_id?: number | null;
}

export interface BookingRescheduleInput {
  scheduled_date: string;
  slot_start: string;
}

export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
}
