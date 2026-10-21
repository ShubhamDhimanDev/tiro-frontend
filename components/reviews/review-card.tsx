import { ReviewStars } from "./review-stars";
import type { Review } from "@/lib/reviews/types";

function formatPublishedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/**
 * A single Google review. Shown on the PDP as BUSINESS reviews only (decision
 * 2026-10-05, frontend/CLAUDE.md Phase 8): these are Google Business Profile
 * reviews of the business, not of a tyre model, so never label or mark them
 * up as product reviews.
 */
export function ReviewCard({ review, className, compact = false }: { review: Review; className?: string; compact?: boolean }) {
  return (
    <article className={`flex h-full flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-rest md:p-5 ${className ?? ""}`}>
      <div className="flex items-center gap-3">
        {review.author_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- Google-hosted avatar, host isn't configured in next.config.ts's image domains
          <img
            src={review.author_photo_url}
            alt=""
            aria-hidden="true"
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white"
          >
            {initials(review.author_name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{review.author_name}</p>
          <div className="flex items-center gap-2">
            <ReviewStars rating={review.rating} />
            <span className="sr-only">Rated {review.rating} out of 5</span>
            <time dateTime={review.published_at} className="text-xs text-muted">
              {formatPublishedDate(review.published_at)}
            </time>
          </div>
        </div>
      </div>

      {review.body && <p className={`grow text-base text-text ${compact ? "line-clamp-6" : ""}`}>{review.body}</p>}

      {review.reply_body && !compact && (
        <div className="rounded-r-control border-l-2 border-link bg-chip p-3 text-sm text-text">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-link">
            Response from Tiro Mobile Tyres
          </p>
          {review.reply_body}
        </div>
      )}

      {review.review_url && (
        <a
          href={review.review_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-auto inline-flex min-h-11 w-fit items-center text-sm font-semibold text-black underline decoration-gold decoration-[3px] underline-offset-4 hover:text-muted"
        >
          View on Google
        </a>
      )}
    </article>
  );
}
