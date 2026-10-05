import { liveSuburbsBackend } from "./backend-client";
import { stubSuburbsBackend } from "./backend-stub";

/**
 * Single switch point between the live Laravel client and the local dev
 * stub for `GET /api/v1/suburbs` — same pattern as `lib/vehicles/backend.ts`
 * / `lib/location/backend.ts`.
 *
 * backend-agent's endpoint is live as of 2026-09-22 (this domain's whole
 * reason for existing — see `lib/checkout/address.ts`'s `resolveSuburbId()`
 * doc comment), so **live is the default**. Set `SUBURBS_BACKEND=stub` to
 * opt back into the in-memory stub, e.g. for isolated component tests that
 * shouldn't depend on a running Laravel process.
 */
export const suburbsBackend = process.env.SUBURBS_BACKEND === "stub" ? stubSuburbsBackend : liveSuburbsBackend;
