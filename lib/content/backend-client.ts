import type { BackendResponse } from "./types";

/**
 * Live wiring to Laravel's `/api/v1/content/*` endpoints — see
 * docs/architecture/02-api-contract.md's "Content (CMS) endpoints" section.
 * Confirmed live against the real backend this round (routes registered,
 * exercised end-to-end against a locally migrated/seeded DB — response
 * shapes matched the contract exactly, no gaps found), same "confirm
 * against the real controller, not just the doc" posture every prior
 * phase's `backend-client.ts` documents for itself.
 *
 * `LARAVEL_API_URL` defaults to `http://localhost:8000`, matching every
 * other domain's client.
 */

const LARAVEL_API_URL = process.env.LARAVEL_API_URL ?? "http://localhost:8000";
const API_BASE = `${LARAVEL_API_URL}/api/v1/content`;

/**
 * `cacheInit` passes through Next's `fetch` caching extensions (`cache`,
 * `next.revalidate`, `next.tags`) — every caller of this domain is an
 * SSG/ISR page or the shared FAQ block, so the tag vocabulary from
 * docs/architecture/02-api-contract.md's "ISR on-demand revalidation
 * webhook" table must be supplied at the call site (see `lib/content/tags.ts`).
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

export const liveContentBackend = {
  pages: (params: URLSearchParams, cacheInit?: RequestInit) => call(`/pages?${params.toString()}`, cacheInit),

  pageDetail: (type: string, slug: string, cacheInit?: RequestInit) =>
    call(`/pages/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`, cacheInit),

  faqs: (params: URLSearchParams, cacheInit?: RequestInit) => call(`/faqs?${params.toString()}`, cacheInit),
};

export type ContentBackend = typeof liveContentBackend;
