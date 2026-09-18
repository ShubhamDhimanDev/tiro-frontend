import { liveVehiclesBackend } from "./backend-client";
import { stubVehiclesBackend } from "./backend-stub";

/**
 * Single switch point between the live Laravel client and the local dev
 * stub for the vehicle identification / fitment domain (`/api/v1/vehicles/*`)
 * — same pattern as `lib/catalog/backend.ts` and `lib/location/backend.ts`.
 *
 * Unlike those two domains at the point they were first built, this round's
 * task brief confirmed all four endpoints are live and real — independently
 * verified against the actual controller, not just trusted from a status
 * report — before this round was dispatched. So **live is the default from
 * the start**, no stub-then-reconcile step. Set `VEHICLES_BACKEND=stub` to
 * opt back into the in-memory stub, e.g. for isolated component tests that
 * shouldn't depend on a running Laravel process.
 */
export const vehiclesBackend = process.env.VEHICLES_BACKEND === "stub" ? stubVehiclesBackend : liveVehiclesBackend;
