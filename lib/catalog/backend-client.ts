import type { BackendResponse } from "./types";

/**
 * Live wiring to Laravel's `/api/v1/tyres*` and `/api/v1/brands` endpoints
 * — see docs/architecture/02-api-contract.md's "Catalogue & location
 * endpoints" section for the contract. Not yet exercised against a running
 * backend (see `backend.ts` — this domain defaults to the stub until
 * backend-agent's endpoints land).
 *
 * `LARAVEL_API_URL` defaults to `http://localhost:8000`, matching
 * `backend/.env`'s `APP_URL` for local dev — same convention as
 * `lib/auth/backend-client.ts` / `lib/location/backend-client.ts`.
 */

const LARAVEL_API_URL = process.env.LARAVEL_API_URL ?? "http://localhost:8000";
const API_BASE = `${LARAVEL_API_URL}/api/v1`;

/**
 * `cacheInit` lets callers pass through Next's `fetch` caching extensions
 * (`cache`, `next.revalidate`, `next.tags`) so SSG/ISR pages (brand/browse/
 * PDP-static) and always-fresh calls (availability) get the right caching
 * behaviour at the call site — see the individual page/route files for
 * which each endpoint needs, per the server-rendered-vs-client-fetched
 * table in docs/architecture/02-api-contract.md.
 */
async function call(path: string, cacheInit: RequestInit = {}): Promise<BackendResponse<unknown>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      ...cacheInit,
    });
  } catch {
    return { status: 503, body: { message: "We couldn't reach the server. Please try again shortly." } };
  }

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export const liveCatalogBackend = {
  search: (params: URLSearchParams, cacheInit?: RequestInit) => call(`/tyres?${params.toString()}`, cacheInit),

  popularSizes: (cacheInit?: RequestInit) => call(`/tyres/popular-sizes`, cacheInit),

  latestReleases: (params: URLSearchParams, cacheInit?: RequestInit) =>
    call(`/tyres/latest-releases?${params.toString()}`, cacheInit),

  brands: (cacheInit?: RequestInit) => call(`/brands`, cacheInit),

  variantDetail: (slug: string, cacheInit?: RequestInit) => call(`/tyres/${encodeURIComponent(slug)}`, cacheInit),

  availability: (slug: string, zone: string | null) =>
    call(`/tyres/${encodeURIComponent(slug)}/availability?zone=${encodeURIComponent(zone ?? "")}`, { cache: "no-store" }),
};

export type CatalogBackend = typeof liveCatalogBackend;
