import { liveContentBackend } from "./backend-client";
import { stubContentBackend } from "./backend-stub";

/**
 * Single switch point between the live Laravel client and the local dev
 * stub for the Content/CMS domain (`/api/v1/content/pages*`,
 * `/api/v1/content/faqs`) — same pattern as every other domain's
 * `backend.ts` (`lib/catalog/backend.ts`, `lib/vehicles/backend.ts`, ...).
 *
 * backend-agent's Content endpoints are confirmed live as of this round
 * (routes registered, exercised end-to-end against a migrated/seeded local
 * DB, response shapes matched the contract exactly) — **live is the
 * default from the start**, same "verified against the real controller
 * before this round shipped" posture `lib/vehicles/backend.ts` documents
 * for itself. Set `CONTENT_BACKEND=stub` to opt into the in-memory stub —
 * e.g. for isolated component tests that shouldn't depend on a running
 * Laravel process.
 */
export const contentBackend = process.env.CONTENT_BACKEND === "stub" ? stubContentBackend : liveContentBackend;
