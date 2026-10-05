import { liveBookingBackend } from "./backend-client";
import { stubBookingBackend } from "./backend-stub";

/**
 * Single switch point between the live Laravel client and the local dev
 * stub for the booking/capacity domain (`/api/v1/booking-slots`,
 * `/api/v1/bookings*`) — same pattern as `lib/vehicles/backend.ts` /
 * `lib/catalog/backend.ts`.
 *
 * Like the vehicles domain, this round's task brief confirmed the real
 * endpoints exist and match the documented contract by reading the actual
 * controllers/requests (`BookingController`, `BookingSlotController`,
 * `StoreBookingRequest`, `BookingSlotsRequest`, `ValidatesBookingCart`, the
 * `idempotency` middleware alias in `bootstrap/app.php`) before this round
 * was dispatched — not just trusted from a status report. So **live is the
 * default from the start**. Set `BOOKING_BACKEND=stub` to opt back into the
 * in-memory stub, e.g. for isolated component tests that shouldn't depend
 * on a running Laravel process.
 */
export const bookingBackend = process.env.BOOKING_BACKEND === "stub" ? stubBookingBackend : liveBookingBackend;
