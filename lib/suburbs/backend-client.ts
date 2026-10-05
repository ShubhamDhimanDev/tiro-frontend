import type { BackendResponse } from "./types";

/**
 * Live wiring to Laravel's `GET /api/v1/suburbs?postcode=&name=` — see
 * docs/architecture/02-api-contract.md's "`GET /api/v1/suburbs` — resolving
 * a `Suburb.id`" section for the contract. Same conventions as
 * `lib/vehicles/backend-client.ts`.
 *
 * `LARAVEL_API_URL` defaults to `http://localhost:8000`, matching
 * `backend/.env`'s `APP_URL` for local dev. `cache: "no-store"` — same
 * "nothing here is ever server-rendered for a static first paint" reasoning
 * `lib/vehicles/backend-client.ts` documents, every call is triggered by a
 * live Places pick during checkout.
 */

const LARAVEL_API_URL = process.env.LARAVEL_API_URL ?? "http://localhost:8000";
const API_BASE = `${LARAVEL_API_URL}/api/v1`;

/**
 * `postcode`/`name` are both required by the contract (either missing is
 * 422) — omitting a param entirely (rather than sending it empty) when it's
 * `null` so a genuinely missing param reaches Laravel as missing, not as
 * present-but-empty, same rigor `lib/vehicles/backend-client.ts`'s
 * `models()` documents for its own `make` param.
 */
async function lookup(postcode: string | null, name: string | null): Promise<BackendResponse<unknown>> {
  const params = new URLSearchParams();
  if (postcode !== null) params.set("postcode", postcode);
  if (name !== null) params.set("name", name);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/suburbs?${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { status: 503, body: { message: "We couldn't reach the server. Please try again shortly." } };
  }

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/** `GET /suburbs/search?q=&limit=` (Phase 7): suburb or postcode prefix typeahead. Validation (2 to 60 chars) stays the API's job. */
async function search(q: string | null, limit?: string | null): Promise<BackendResponse<unknown>> {
  const params = new URLSearchParams();
  if (q !== null) params.set("q", q);
  if (limit) params.set("limit", limit);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/suburbs/search?${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { status: 503, body: { message: "We couldn't reach the server. Please try again shortly." } };
  }

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export const liveSuburbsBackend = { lookup, search };
export type SuburbsBackend = typeof liveSuburbsBackend;
