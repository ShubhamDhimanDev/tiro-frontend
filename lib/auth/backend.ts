import { liveAuthBackend } from "./backend-client";
import { stubAuthBackend } from "./backend-stub";

/**
 * Single switch point between the live Laravel client and the local dev
 * stub. Every Route Handler under `app/api/auth/**` imports `authBackend`
 * from here — none of them know or care which implementation is active.
 *
 * backend-agent's `/api/v1/auth/*` endpoints are live as of 2026-09-10
 * (docs/architecture/08-customer-auth-otp.md §12), so **live is now the
 * default** — every production/dev code path talks to real Laravel unless
 * explicitly told otherwise. Set `LARAVEL_API_URL` if Laravel isn't at
 * `http://localhost:8000`.
 *
 * The in-memory stub remains available, opt-in only, via
 * `AUTH_BACKEND=stub` — e.g. for isolated component tests that shouldn't
 * depend on a running Laravel process. Do not flip this default back
 * without a good reason; a production/staging deploy silently falling back
 * to the stub would accept fake credentials and issue fake tokens.
 */
export const authBackend = process.env.AUTH_BACKEND === "stub" ? stubAuthBackend : liveAuthBackend;
