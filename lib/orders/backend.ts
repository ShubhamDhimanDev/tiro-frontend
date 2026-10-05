import { liveOrdersBackend } from "./backend-client";
import { stubOrdersBackend } from "./backend-stub";

/**
 * Single switch point between the live Laravel client and the local dev
 * stub for the Order/checkout/payment domain (`POST /api/v1/orders`,
 * `GET /api/v1/orders/{order}`) — same pattern as `lib/booking/backend.ts` /
 * `lib/cart/backend.ts`.
 *
 * Live is the default from the start: this round's task brief confirmed the
 * real endpoints exist and match the documented contract by reading the
 * actual controller/request (`OrderController`, `StoreOrderRequest`) before
 * this round was dispatched, not just trusted from a status report — same
 * posture every other domain in this app documents for itself. Set
 * `ORDERS_BACKEND=stub` to opt back into the in-memory stub, e.g. for
 * isolated component tests that shouldn't depend on a running Laravel
 * process (or, this phase specifically, that shouldn't depend on real
 * Stripe keys — see `backend-stub.ts`'s doc comment).
 */
export const ordersBackend = process.env.ORDERS_BACKEND === "stub" ? stubOrdersBackend : liveOrdersBackend;
