import { bookingApi } from "@/lib/booking/client-api";
import type { BookingAddonKey, BookingCreateInput, BookingItemInput, BookingRecord } from "@/lib/booking/types";
import type { FittingSelection } from "@/lib/checkout/fitting-selection";

/**
 * Turns the wizard's fitting choice into a real 15-minute booking hold
 * (`POST /bookings`), re-using or releasing the previous hold as the choice
 * changes. The hold is the durable cart from then on: orders are created
 * against `booking_id`, never against raw items.
 */

export interface HeldBooking {
  record: BookingRecord;
  /** Serialised request the hold was created for: a different key means a different booking. */
  bodyKey: string;
}

/** One idempotency key per distinct request body, reused across retries of that same body. */
export interface IdempotencyState {
  bodyKey: string | null;
  key: string | null;
}

export type EnsureHoldResult =
  | { kind: "ok"; held: HeldBooking }
  | { kind: "conflict"; message: string }
  | { kind: "promo"; message: string }
  | { kind: "flexible"; message: string }
  | { kind: "zone" }
  /** `retryable`: the service itself failed (5xx / network), so the same request may succeed shortly. */
  | { kind: "error"; message: string; retryable?: boolean };

export function holdBody(args: {
  zoneId: string;
  fitting: FittingSelection;
  items: BookingItemInput[];
  addons: BookingAddonKey[];
  promoCode?: string | null;
}): BookingCreateInput {
  const { zoneId, fitting, items, addons, promoCode } = args;
  return {
    service_zone_id: zoneId,
    scheduled_date: fitting.date,
    // Flexible: no slot, the server assigns a real one. Otherwise the chosen time.
    ...(fitting.flexible ? { flexible: true } : { slot_start: fitting.slot ?? undefined }),
    ...(promoCode ? { promo_code: promoCode } : {}),
    items,
    addons,
  };
}

export async function ensureHold(args: {
  body: BookingCreateInput;
  current: HeldBooking | null;
  idempotency: IdempotencyState;
}): Promise<EnsureHoldResult> {
  const { body, current, idempotency } = args;
  const bodyKey = JSON.stringify(body);

  if (current) {
    const fresh = await bookingApi.show(current.record.id);
    const stillHeld = fresh.kind === "success" && fresh.data.data.status === "pending_hold";
    if (stillHeld && current.bodyKey === bodyKey) {
      return { kind: "ok", held: { record: fresh.data.data, bodyKey } };
    }
    // The choice changed: release the old time so it is not held against ourselves.
    // Only a booking that is still a pending hold is cancelled (never a confirmed one),
    // and a failure is ignored (an unreleased hold expires on its own in 15 minutes).
    if (stillHeld) await bookingApi.cancel(current.record.id);
  }

  if (idempotency.bodyKey !== bodyKey || !idempotency.key) {
    idempotency.bodyKey = bodyKey;
    idempotency.key = crypto.randomUUID();
  }

  const result = await bookingApi.create(body, idempotency.key);
  if (result.kind === "success") return { kind: "ok", held: { record: result.data.data, bodyKey } };

  // A rejected attempt must not be replayed under the same key if the customer changes something.
  if (result.kind === "conflict") {
    idempotency.key = null;
    return { kind: "conflict", message: `${result.message} Choose another time.` };
  }
  if (result.kind === "validation_error") {
    idempotency.key = null;
    if (result.errors.promo_code?.length) return { kind: "promo", message: result.errors.promo_code[0] };
    if (result.errors.flexible?.length) {
      return { kind: "flexible", message: "Flexible arrival is not available on that day any more. Choose a specific time instead." };
    }
    return { kind: "error", message: result.message };
  }
  if (result.kind === "not_found") return { kind: "zone" };
  return { kind: "error", message: result.message, retryable: result.kind === "unknown_error" };
}
