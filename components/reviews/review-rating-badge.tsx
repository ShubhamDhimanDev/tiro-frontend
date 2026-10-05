import { ReviewStars } from "./review-stars";
import type { ReviewsSummary } from "@/lib/reviews/types";

/**
 * Aggregate rating badge — `meta.summary.average_rating`/`total_count`
 * straight off the API response, nothing computed client-side (same
 * "read fields off the response, don't re-derive" posture
 * `components/cart/cart-totals.tsx`'s promotion breakdown documents for
 * itself). Used by both the homepage widget and `/reviews`.
 */
export function ReviewRatingBadge({ summary }: { summary: ReviewsSummary }) {
  if (summary.total_count === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-4xl font-bold text-ink">{summary.average_rating.toFixed(1)}</span>
      <div className="flex flex-col">
        <ReviewStars rating={summary.average_rating} className="text-xl" />
        <span className="text-sm text-muted">
          {summary.total_count.toLocaleString()} Google review{summary.total_count === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
