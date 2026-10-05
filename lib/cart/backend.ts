import { liveCartBackend } from "./backend-client";
import { stubCartBackend } from "./backend-stub";

/**
 * Single switch point between the live Laravel client and the local dev
 * stub for the cart-pricing domain (`POST /api/v1/cart/calculate`) — same
 * pattern as `lib/booking/backend.ts` / `lib/vehicles/backend.ts`.
 *
 * Live is the default from the start: this round's task brief confirmed the
 * real endpoint exists and matches the documented contract by reading the
 * actual controller/request (`CartController`, `CartCalculateRequest`,
 * `PricingService`) before this round was dispatched, not just trusted from
 * a status report — same posture `lib/vehicles/backend.ts`/
 * `lib/booking/backend.ts` document for their own domains. Set
 * `CART_BACKEND=stub` to opt back into the in-memory stub, e.g. for isolated
 * component tests that shouldn't depend on a running Laravel process.
 */
export const cartBackend = process.env.CART_BACKEND === "stub" ? stubCartBackend : liveCartBackend;
