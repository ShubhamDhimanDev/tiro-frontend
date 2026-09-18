import { liveLocationBackend } from "./backend-client";
import { stubLocationBackend } from "./backend-stub";

/**
 * Single switch point between the live Laravel client and the local dev
 * stub, same pattern as `lib/auth/backend.ts`. Every Route Handler under
 * `app/api/location/**` imports `locationBackend` from here.
 *
 * backend-agent's `POST /api/v1/serviceability` endpoint is live as of
 * 2026-09-11, so **live is now the default** — every production/dev code
 * path talks to real Laravel unless explicitly told otherwise. Set
 * `LARAVEL_API_URL` if Laravel isn't at `http://localhost:8000`.
 *
 * The in-memory stub remains available, opt-in only, via
 * `LOCATION_BACKEND=stub` — e.g. for isolated component tests that
 * shouldn't depend on a running Laravel process.
 */
export const locationBackend = process.env.LOCATION_BACKEND === "stub" ? stubLocationBackend : liveLocationBackend;
