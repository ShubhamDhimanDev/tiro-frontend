import { liveReviewsBackend } from "./backend-client";
import { stubReviewsBackend } from "./backend-stub";

/**
 * Single switch point between the live Laravel client and the local
 * in-memory stub for the Reviews domain (`GET /api/v1/reviews`) — same
 * pattern as every other domain's `backend.ts`.
 *
 * **Live is the default, as of this follow-up round** — backend-agent's
 * `GET /api/v1/reviews` is now confirmed real: registered
 * (`routes/api.php`, `Route::get('reviews', [ReviewController::class,
 * 'index'])`), and the response shape verified directly against the real
 * controller/resource (`Api\V1\Reviews\ReviewController::index()`,
 * `ReviewResource`, `ReviewIndexRequest`) — not just a status report, same
 * verification bar every other domain's flip-to-live documents for itself.
 * Field names and `meta.summary` nesting match `lib/reviews/types.ts`
 * exactly, with one contract correction folded in alongside this flip:
 * `body`/`review_url` are genuinely nullable (`Review::$body`,
 * `Review::$review_url`), not the non-nullable `string` this domain
 * originally shipped with — see `lib/reviews/types.ts`'s own doc comments.
 * Set `REVIEWS_BACKEND=stub` to opt back into the in-memory stub (e.g.
 * isolated component tests without Laravel running), matching the
 * `=stub`-to-opt-out convention every other domain in this app uses —
 * this was the one domain still inverted (`=live` to opt in) from when it
 * shipped stub-default ahead of backend-agent's build landing.
 */
export const reviewsBackend = process.env.REVIEWS_BACKEND === "stub" ? stubReviewsBackend : liveReviewsBackend;
