import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site/seo";
import { reviewsBackend } from "@/lib/reviews/backend";
import { reviewsTag } from "@/lib/reviews/tags";
import { ReviewRatingBadge } from "@/components/reviews/review-rating-badge";
import { ReviewCard } from "@/components/reviews/review-card";
import { ReviewsPagination } from "@/components/reviews/reviews-pagination";
import { CtaBands } from "@/components/page/cta-bands";
import { Mark, PageHero } from "@/components/page/page-hero";
import type { ReviewsResponse } from "@/lib/reviews/types";

/**
 * `/reviews` — the full paginated list of Google Business Profile reviews.
 * Confirmed route name per the task brief ("this is the confirmed route
 * name, not `/testimonials`").
 *
 * Reads `searchParams` for `?page=` — a Request-time API under this
 * project's classic caching model (`cacheComponents` is off), same SSR
 * posture `app/tyres/(catalog)/page.tsx` already documents for itself for the
 * identical reason (a paginated list needs the page number at request
 * time; there's no static param set to pre-generate against the way
 * `generateStaticParams` covers PDP slugs). This does **not** defeat the
 * ISR posture the task brief asks for: the underlying `reviewsBackend.list()`
 * fetch below explicitly sets `next: { revalidate: 86400, tags: ["reviews"] }`,
 * which — per node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md's
 * "Route segment config" section — opts that specific fetch into the Data
 * Cache regardless of the route's own dynamic rendering; only the page
 * *shell* re-executes per request, and each `?page=N` URL's Data Cache
 * entry is still reused for up to a day and still invalidated instantly by
 * the `reviews` tag on the daily-sync/moderation webhook.
 */

export const metadata: Metadata = pageMetadata({
  title: "Reviews | Tiro Mobile Tyres",
  description: "See what customers are saying about booking a mobile tyre fitting with Tiro Mobile Tyres.",
  path: "/reviews",
});

async function loadReviews(page: number): Promise<ReviewsResponse | null> {
  const params = new URLSearchParams({ page: String(page) });
  const result = await reviewsBackend.list(params, { next: { revalidate: 86400, tags: [reviewsTag()] } });
  if (result.status !== 200) return null;
  return result.body as ReviewsResponse;
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const pageRaw = Array.isArray(raw.page) ? raw.page[0] : raw.page;
  const page = Math.max(1, Number(pageRaw ?? "1") || 1);

  const live = await loadReviews(page);
  const reviews = live;

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "About us", url: "/about" },
    { name: "Reviews", url: "/reviews" },
  ];

  return (
    <>
      <PageHero
        crumbs={breadcrumbs}
        eyebrow="About us"
        title={
          <>
            Customer <Mark>reviews</Mark>
          </>
        }
        lead="Genuine reviews from our Google Business Profile. We do not edit or select which ones show here."
        aside={
          reviews && reviews.meta.summary.total_count > 0 ? (
            <div className="mx-auto w-fit rounded-card bg-surface px-6 py-5 text-black shadow-raised">
              <ReviewRatingBadge summary={reviews.meta.summary} />
            </div>
          ) : undefined
        }
      />

      <div className="container-page flex flex-col gap-6 py-10 md:py-14">
        {!reviews || reviews.data.length === 0 ? (
          <p className="rounded-card border border-line bg-surface p-6 text-muted">No reviews to show yet. Check back soon.</p>
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {reviews.data.map((review) => (
                <li key={review.id}>
                  <ReviewCard review={review} />
                </li>
              ))}
            </ul>
            <ReviewsPagination meta={reviews.meta} buildHref={(nextPage) => `/reviews?page=${nextPage}`} />
          </>
        )}
      </div>
      <CtaBands />
    </>
  );
}
