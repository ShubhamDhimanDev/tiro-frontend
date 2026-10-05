import type { BackendResponse } from "./types";

/**
 * Live wiring to Laravel's `GET /api/v1/reviews` — public, no auth header,
 * same shape as every other domain's `backend-client.ts` (see
 * `lib/content/backend-client.ts` for the closest sibling: also a
 * read-only, publicly-cacheable listing endpoint).
 *
 * `LARAVEL_API_URL` defaults to `http://localhost:8000`, matching every
 * other domain.
 */

const LARAVEL_API_URL = process.env.LARAVEL_API_URL ?? "http://localhost:8000";
const API_BASE = `${LARAVEL_API_URL}/api/v1`;

/**
 * `cacheInit` passes through Next's `fetch` caching extensions (`cache`,
 * `next.revalidate`, `next.tags`) — every caller of this domain is an
 * SSG/ISR-fed page (the homepage widget, `/reviews`), so the `reviews` tag
 * from `lib/reviews/tags.ts` plus the 86400s (daily-sync-matching) fallback
 * revalidate window must be supplied at the call site.
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

export const liveReviewsBackend = {
  list: (params: URLSearchParams, cacheInit?: RequestInit) => call(`/reviews?${params.toString()}`, cacheInit),
};

export type ReviewsBackend = typeof liveReviewsBackend;
