import type { BackendResponse } from "./types";

/**
 * Live wiring to `GET /api/v1/offers` and `/offers/{slug}` (public, no auth).
 * `cacheInit` passes Next's fetch caching options through so every caller,
 * all SSG/ISR pages, sets its own revalidate/tags.
 */
const LARAVEL_API_URL = process.env.LARAVEL_API_URL ?? "http://localhost:8000";
const API_BASE = `${LARAVEL_API_URL}/api/v1/offers`;

async function call(path: string, cacheInit: RequestInit = {}): Promise<BackendResponse<unknown>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" }, ...cacheInit });
  } catch {
    return { status: 503, body: { message: "We couldn't reach the server. Please try again shortly." } };
  }
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export const liveOffersBackend = {
  list: (cacheInit?: RequestInit) => call("", cacheInit),
  detail: (slug: string, cacheInit?: RequestInit) => call(`/${encodeURIComponent(slug)}`, cacheInit),
};

export type OffersBackend = typeof liveOffersBackend;
