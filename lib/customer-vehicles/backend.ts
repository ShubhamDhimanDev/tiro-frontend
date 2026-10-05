import { liveCustomerVehiclesBackend } from "./backend-client";
import { stubCustomerVehiclesBackend } from "./backend-stub";

/**
 * Single switch point between the live Laravel client and the local dev
 * stub for the saved-vehicles domain — same pattern as
 * `lib/price-guarantee/backend.ts`.
 *
 * Live is the default from the start: this round's task brief was
 * dispatched with backend-agent's Phase 7 endpoints already independently
 * verified against the real controllers (per the root brief, "verified
 * directly by me against real files"), same posture every other
 * live-by-default domain in this app documents for itself. Set
 * `CUSTOMER_VEHICLES_BACKEND=stub` to opt back into the in-memory stub,
 * e.g. for isolated component tests that shouldn't depend on a running
 * Laravel process.
 */
export const customerVehiclesBackend =
  process.env.CUSTOMER_VEHICLES_BACKEND === "stub" ? stubCustomerVehiclesBackend : liveCustomerVehiclesBackend;
