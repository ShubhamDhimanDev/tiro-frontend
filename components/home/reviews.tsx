import Link from "next/link";
import { StarIcon } from "@/components/ui/icons";
import type { HomeReviews } from "@/lib/home/load";

function Stars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className="flex gap-0.5 text-gold">
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} className={i < rating ? "h-4 w-4 fill-current" : "h-4 w-4 text-line"} />
      ))}
    </span>
  );
}

/**
 * "What our customers are saying": native review cards from `GET /reviews`
 * (Google Business Profile sync), no third-party widget. The average comes
 * from the API's own summary and is only shown when it has a count. Hidden
 * entirely when there are no reviews to show. Horizontal swipe row on phones,
 * 4-up grid on desktop.
 */
export function ReviewsSection({ data }: { data?: HomeReviews }) {
  const { reviews = [], summary = null } = data ?? {};
  if (reviews.length === 0) return null;
  return (
    <section aria-labelledby="reviews-heading" className="container-page pt-[50px] lg:pt-20">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 lg:mb-8">
        <h2 id="reviews-heading" className="type-h2">
          What our customers are saying
        </h2>
        {summary && (
          <p className="flex items-center gap-2 text-[15px] font-bold text-black">
            <Stars rating={Math.round(summary.average_rating)} />
            {summary.average_rating.toFixed(1)} out of 5 from {summary.total_count} Google review{summary.total_count === 1 ? "" : "s"}
          </p>
        )}
      </div>
      <ul className="no-scrollbar -mx-[var(--gutter)] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4">
        {reviews.map((r) => (
          <li key={r.id} className="w-[82%] shrink-0 snap-start md:w-auto">
            <figure className="flex h-full flex-col gap-3 rounded-card border border-line bg-surface p-5">
              <Stars rating={r.rating} />
              <blockquote className="line-clamp-6 text-sm leading-6 text-[#333]">{r.body}</blockquote>
              <figcaption className="mt-auto">
                <span className="block text-base font-medium text-black">{r.author_name}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
      <Link href="/reviews" className="mt-4 inline-flex min-h-11 items-center font-bold text-black underline underline-offset-4">
        Read all reviews
      </Link>
    </section>
  );
}
