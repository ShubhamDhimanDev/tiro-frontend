/**
 * Shared types for the public Reviews boundary — `GET /api/v1/reviews`.
 * Mirrors the exact contract handed to frontend-agent this round (Phase 8,
 * a `backend-agent` task built in parallel against the same shape) rather
 * than any earlier draft: public, no auth, `page`/`per_page` query params
 * only (`per_page` default 10, max 50), sorted `published_at` descending,
 * hidden reviews always excluded server-side (never filtered client-side).
 *
 * These are Google Business Profile reviews attached to the business as a
 * whole (`source: "google"`), not to individual products — deliberately
 * never surfaced on the PDP (`app/tyres/[slug]/page.tsx`). See that page's
 * own doc comment and the completion report for why that's a product
 * decision, not a gap.
 */

/** Only `"google"` is documented today; typed as a free string rather than
 * a guessed enum, same posture `lib/vehicles/types.ts` takes for
 * `confidence` when the contract's own example shows only one value. */
export type ReviewSource = string;

export interface Review {
  id: number;
  source: ReviewSource;
  author_name: string;
  author_photo_url: string | null;
  rating: number;
  /** Nullable per `Review::$body`'s real schema — Google's review-text field
   * itself is optional (a rating with no written comment). */
  body: string | null;
  /** The business's own reply to the review, if any — `null` when unreplied. */
  reply_body: string | null;
  /** Nullable per `Review::$review_url`'s real schema, and expected to
   * actually BE `null` for essentially every synced row: per
   * `SyncGoogleReviewsCommand::upsert()`'s own docblock, Google's
   * `accounts.locations.reviews` v4 API doesn't appear to return a
   * `reviewUrl` field at all, despite the defensive nullable read. Treat
   * this as the common case, not a rare edge case — never render an
   * unconditional link off it. */
  review_url: string | null;
  published_at: string;
}

export interface ReviewsSummary {
  average_rating: number;
  total_count: number;
}

export interface ReviewsMeta {
  current_page: number;
  per_page: number;
  total: number;
  summary: ReviewsSummary;
}

export interface ReviewsResponse {
  data: Review[];
  meta: ReviewsMeta;
}

export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
}
