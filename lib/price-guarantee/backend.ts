import { livePriceGuaranteeBackend } from "./backend-client";
import { stubPriceGuaranteeBackend } from "./backend-stub";

/**
 * Single switch point between the live Laravel client and the local dev
 * stub for the price-guarantee-claim domain — same pattern as
 * `lib/cart/backend.ts` / `lib/orders/backend.ts`.
 *
 * Live is the default from the start: this round's task brief confirmed the
 * real endpoints exist and match the documented contract by reading the
 * actual controller/request/resource (`PriceGuaranteeClaimController`,
 * `StorePriceGuaranteeClaimRequest`, `PriceGuaranteeClaimResource`) before
 * this round was dispatched, not just trusted from a status report — same
 * posture every other live-by-default domain in this app documents for
 * itself. Set `PRICE_GUARANTEE_BACKEND=stub` to opt back into the in-memory
 * stub, e.g. for isolated component tests that shouldn't depend on a
 * running Laravel process.
 */
export const priceGuaranteeBackend =
  process.env.PRICE_GUARANTEE_BACKEND === "stub" ? stubPriceGuaranteeBackend : livePriceGuaranteeBackend;
