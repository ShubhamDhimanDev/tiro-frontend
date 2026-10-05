import { FIXTURE_REVIEWS } from "./fixtures";
import type { BackendResponse, ReviewsResponse } from "./types";

/**
 * In-memory dev/test stub for `GET /api/v1/reviews`. Backend-agent's real
 * endpoint is now confirmed live and is the default (see `backend.ts`) —
 * set `REVIEWS_BACKEND=stub` to opt back into this stub instead (e.g.
 * isolated component tests without Laravel running), same convention every
 * other domain in this app uses.
 *
 * Mirrors the documented contract's shape exactly: default `per_page=10`,
 * clamped to a max of 50; `data` sorted `published_at` descending (the
 * fixture set is already pre-sorted, not re-sorted here, same convention
 * `lib/content/backend-stub.ts` follows for its own fixtures); hidden
 * reviews are never modelled at all (the fixture set only contains
 * visible rows) rather than adding a `hidden` flag this stub would then
 * have to remember to filter — matches "you never need to filter
 * client-side" from the contract.
 */

const DEFAULT_PER_PAGE = 10;
const MAX_PER_PAGE = 50;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function summarize() {
  const total = FIXTURE_REVIEWS.length;
  const average = total === 0 ? 0 : FIXTURE_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / total;
  return { average_rating: round1(average), total_count: total };
}

async function list(params: URLSearchParams, _cacheInit?: RequestInit): Promise<BackendResponse<ReviewsResponse>> {
  void _cacheInit; // stub has no real caching to configure — kept for signature parity with the live client

  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const requestedPerPage = Number(params.get("per_page") ?? String(DEFAULT_PER_PAGE)) || DEFAULT_PER_PAGE;
  const perPage = Math.min(Math.max(1, requestedPerPage), MAX_PER_PAGE);

  const start = (page - 1) * perPage;
  const data = FIXTURE_REVIEWS.slice(start, start + perPage);

  return {
    status: 200,
    body: {
      data,
      meta: {
        current_page: page,
        per_page: perPage,
        total: FIXTURE_REVIEWS.length,
        summary: summarize(),
      },
    },
  };
}

export const stubReviewsBackend = { list };
export type ReviewsBackend = typeof stubReviewsBackend;
