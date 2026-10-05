/**
 * ISR tag vocabulary for the Reviews domain — one place this string gets
 * built, same "don't inline template strings at every call site" posture
 * `lib/content/tags.ts` documents for itself. Per the task brief: "the
 * backend fires a webhook to `/api/api/revalidate`" [sic — the existing
 * route is `app/api/revalidate/route.ts`, i.e. `POST /api/revalidate`]
 * "tagged `reviews` after each sync/moderation change." A single flat tag
 * (not per-page/per-id like content's vocabulary) because there's exactly
 * one upstream list this whole domain reads from — every review, the
 * summary, and every page of pagination through it all change together
 * whenever the daily Google sync or a moderation action runs.
 */
export function reviewsTag(): string {
  return "reviews";
}
