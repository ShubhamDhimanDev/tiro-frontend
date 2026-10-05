import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * Test-only `Review` fixture setup via `php artisan tinker --execute=...`,
 * same shelling-out posture/reasoning as `helpers/content.ts`'s
 * `ContentPage`/`Faq` fixtures and `helpers/otp.ts`'s queue-drain (no
 * dedicated test-fixture API this app exposes; `execFileSync` with an argv
 * array rather than a shell string for the same Windows-`cmd.exe`-quoting
 * reason those files document).
 *
 * Unlike `CatalogueSeeder`/`LocationSeeder`, there is no `Review` seeder in
 * `DatabaseSeeder` — reviews only ever originate from
 * `SyncGoogleReviewsCommand`'s upsert in production, so this suite creates
 * its own. **Idempotent** (`updateOrCreate` keyed on `external_id`, same
 * convention `seedContentPages()` uses keyed on `slug`) — safe to re-run
 * against a long-lived dev database, not just the one-shot isolated schema
 * `backend/scripts/test-db.sh` produces for a given E2E session.
 *
 * No revalidation call here unlike `helpers/content.ts` — the reviews fetch
 * (`lib/reviews/tags.ts`'s `reviews` tag) is only ever revalidated by this
 * suite's own explicit `POST /api/revalidate` calls in the spec itself,
 * mirroring how `content/faq.spec.ts` keeps that call visible in the spec
 * rather than buried in a shared helper, since exercising the webhook for
 * real is part of what these specs demonstrate.
 */

const BACKEND_DIR = path.resolve(__dirname, "../../../../backend");

function tinker(code: string): string {
  try {
    return execFileSync("php", ["artisan", "tinker", `--execute=${code}`], {
      cwd: BACKEND_DIR,
      stdio: "pipe",
    }).toString();
  } catch (err) {
    throw new Error(
      `Failed to run \`php artisan tinker --execute=...\` in ${BACKEND_DIR} for review test-fixture setup. ` +
        `Is \`php\` on PATH and is this checkout's backend/ the one wired to the running Laravel instance?\n\n${String(err)}`
    );
  }
}

/**
 * Distinctive, easily-`grep`-able fixture values — used to positively
 * confirm `/reviews` (and the homepage widget) are reading from the real
 * Laravel backend rather than silently still serving `lib/reviews/fixtures.ts`'s
 * stub data (none of which contains these strings).
 */
export const REVIEW_FIXTURES = {
  distinctiveExternalId: "e2e-distinctive-review-9f3c1a",
  distinctiveAuthorName: "E2E Distinctive Live-Backend Reviewer 9f3c1a",
  distinctiveBody: "E2E distinctive review body confirming the live backend 9f3c1a",
  nullFieldsExternalId: "e2e-null-fields-review",
  nullFieldsAuthorName: "E2E Null-Fields Reviewer",
} as const;

/**
 * Seeds:
 *   - one distinctively-named, fully-populated review (confirms live-backend
 *     wiring, not stub fallback),
 *   - one review with `body: null` AND `review_url: null` (the exact
 *     nullability case the Phase 8 follow-up fix-pass targeted), and
 *   - enough additional (generic, factory-generated) visible rows that
 *     `/reviews` has more than one page at the contract's documented
 *     `per_page=10` default, so pagination has something real to exercise.
 *
 * Both named fixtures are pinned to the most recent `published_at` values
 * (`now()`/`now()->subMinute()`) so they reliably land on page 1 regardless
 * of how many generic rows exist alongside them.
 */
export async function seedReviews(): Promise<void> {
  tinker(
    `App\\Models\\Review::updateOrCreate(['external_id'=>'${REVIEW_FIXTURES.distinctiveExternalId}'], [` +
      `'source'=>App\\Enums\\ReviewSource::Google,` +
      `'author_name'=>'${REVIEW_FIXTURES.distinctiveAuthorName}',` +
      `'author_photo_url'=>null,'rating'=>5,` +
      `'body'=>'${REVIEW_FIXTURES.distinctiveBody}',` +
      `'review_url'=>'https://g.page/r/e2e-9f3c1a',` +
      `'reply_body'=>null,'is_hidden'=>false,'published_at'=>now(),'cached_at'=>now()]); ` +
      `App\\Models\\Review::updateOrCreate(['external_id'=>'${REVIEW_FIXTURES.nullFieldsExternalId}'], [` +
      `'source'=>App\\Enums\\ReviewSource::Google,` +
      `'author_name'=>'${REVIEW_FIXTURES.nullFieldsAuthorName}',` +
      `'author_photo_url'=>null,'rating'=>4,` +
      `'body'=>null,'review_url'=>null,` +
      `'reply_body'=>null,'is_hidden'=>false,'published_at'=>now()->subMinute(),'cached_at'=>now()]); ` +
      `$existing = App\\Models\\Review::visible()->count(); ` +
      `if ($existing < 12) { App\\Models\\Review::factory()->count(12 - $existing)->create(['published_at'=>now()->subDays(2)]); } ` +
      `echo 'ok';`
  );
}
