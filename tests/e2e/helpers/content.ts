import { execFileSync } from "node:child_process";
import path from "node:path";
import { readFrontendEnvLocal } from "./env";

/**
 * Test-only CMS fixture setup via `php artisan tinker --execute=...`, same
 * shelling-out posture as `helpers/otp.ts`'s queue-drain and
 * `helpers/catalog.ts`'s inventory mutation — see those files' own doc
 * comments for why (no dedicated test-fixture API this app exposes, and
 * `execFileSync` with an argv array rather than a shell string specifically
 * because this suite also runs on Windows dev machines, where `execSync`'s
 * `cmd.exe` re-quoting is fragile for embedded PHP code).
 *
 * Unlike `CatalogueSeeder`/`LocationSeeder` (fixed, stable seed data the
 * catalog/location specs assert against directly), there is no seeder for
 * `ContentPage`/`Faq` in `DatabaseSeeder` as of Phase 6 — this suite has to
 * create its own CMS fixtures. Every function here is **idempotent**
 * (`updateOrCreate` keyed on `slug`, or `firstOrCreate`/delete-then-create
 * for FAQs) specifically so this suite is safe to re-run against a
 * long-lived dev database (not just a fresh, one-shot isolated schema from
 * `backend/scripts/test-db.sh`) without hitting a duplicate-slug/unique
 * constraint on a second run.
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
      `Failed to run \`php artisan tinker --execute=...\` in ${BACKEND_DIR} for content test-fixture setup. ` +
        `Is \`php\` on PATH and is this checkout's backend/ the one wired to the running Laravel instance?\n\n${String(err)}`
    );
  }
}

const FRONTEND_ORIGIN = "http://localhost:3000";

/**
 * Calls the real `POST /api/revalidate` webhook (`app/api/revalidate/route.ts`)
 * directly — not a workaround/stub, this *is* the mechanism
 * `NotifyFrontendRevalidation` uses in production, just invoked directly
 * here instead of via a queue worker relaying Laravel's dispatch. Needed
 * because `tinker`-driven fixture writes above go through real Eloquent
 * `updateOrCreate`/`create` calls, which *do* fire `ContentPage`/`Faq`'s
 * `created`/`updated` events and therefore queue a real
 * `NotifyFrontendRevalidation` job (`App\Observers\FrontendRevalidationObserver`)
 * — but that job only reaches this webhook once *something* drains the
 * queue, which nothing does automatically in this dev environment (no
 * supervisor/Horizon running). Without this, a fixture update to a
 * previously-visited route (e.g. a slug this suite curled/visited before
 * with different seed content) would keep serving stale cached content for
 * up to the route's `revalidate: 3600` window — exactly the staleness this
 * webhook exists to close.
 */
async function revalidate(tags: string[]): Promise<void> {
  const secret = readFrontendEnvLocal("REVALIDATE_WEBHOOK_SECRET");
  const res = await fetch(`${FRONTEND_ORIGIN}/api/revalidate`, {
    method: "POST",
    headers: { "X-Revalidate-Secret": secret, "Content-Type": "application/json" },
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) {
    throw new Error(
      `content fixture setup: POST /api/revalidate failed for tags=${JSON.stringify(tags)} — ${res.status} ${await res.text()}`
    );
  }
}

export const CMS_FIXTURE_SLUGS = {
  blogPublished: "e2e-test-blog-post",
  blogDraft: "e2e-test-blog-draft",
  blogScheduled: "e2e-test-blog-scheduled",
  guide: "e2e-test-guide",
  locationWithZone: "e2e-test-location-richmond",
  promo: "e2e-test-promo-landing",
  page: "e2e-test-general-page",
} as const;

/**
 * Creates (or updates in place) every `ContentPage` row the `content/*`
 * specs need: one published row per type (`blog_post`, `guide`,
 * `location_page` linked to the seeded "Melbourne Metro" zone,
 * `promo_landing`, `page`), plus a `draft` and a future-`published_at`
 * (`scheduled`) `blog_post` — both of which must 404 on the public route
 * despite existing in the DB (`ContentPage::scopePublished()`'s visibility
 * rule). Relies on `LocationSeeder`'s "Melbourne Metro" zone existing
 * (same "assert against known seeded fixture data" posture
 * `tests/e2e/location/serviceability.spec.ts` already takes).
 *
 * Revalidates every affected tag afterwards (see `revalidate()`'s doc
 * comment) so this is safe to call against a route this dev server already
 * rendered/cached with different content in an earlier run/session.
 */
export async function seedContentPages(): Promise<void> {
  tinker(
    `$zone = App\\Models\\ServiceZone::where('name','Melbourne Metro')->firstOrFail(); ` +
      `App\\Models\\ContentPage::updateOrCreate(['slug'=>'${CMS_FIXTURE_SLUGS.blogPublished}'], ['type'=>App\\Enums\\ContentPageType::BlogPost,'title'=>'E2E Test Blog Post','excerpt'=>'An E2E test blog excerpt.','body'=>'<p>E2E blog body.</p>','category'=>'maintenance','status'=>App\\Enums\\PageStatus::Published,'published_at'=>now()->subDay()]); ` +
      `App\\Models\\ContentPage::updateOrCreate(['slug'=>'${CMS_FIXTURE_SLUGS.blogDraft}'], ['type'=>App\\Enums\\ContentPageType::BlogPost,'title'=>'E2E Test Blog Draft','body'=>'<p>Draft body.</p>','status'=>App\\Enums\\PageStatus::Draft,'published_at'=>null]); ` +
      `App\\Models\\ContentPage::updateOrCreate(['slug'=>'${CMS_FIXTURE_SLUGS.blogScheduled}'], ['type'=>App\\Enums\\ContentPageType::BlogPost,'title'=>'E2E Test Blog Scheduled','body'=>'<p>Scheduled body.</p>','status'=>App\\Enums\\PageStatus::Published,'published_at'=>now()->addWeek()]); ` +
      `App\\Models\\ContentPage::updateOrCreate(['slug'=>'${CMS_FIXTURE_SLUGS.guide}'], ['type'=>App\\Enums\\ContentPageType::Guide,'title'=>'E2E Test Guide','excerpt'=>'A guide excerpt.','body'=>'<p>Guide body.</p>','category'=>'buying-guide','status'=>App\\Enums\\PageStatus::Published,'published_at'=>now()->subDay()]); ` +
      `App\\Models\\ContentPage::updateOrCreate(['slug'=>'${CMS_FIXTURE_SLUGS.locationWithZone}'], ['type'=>App\\Enums\\ContentPageType::LocationPage,'title'=>'E2E Test Location - Richmond VIC','excerpt'=>'Mobile tyre fitting in Richmond.','body'=>'<p>Location body.</p>','status'=>App\\Enums\\PageStatus::Published,'published_at'=>now()->subDay(),'service_zone_id'=>$zone->id]); ` +
      `App\\Models\\ContentPage::updateOrCreate(['slug'=>'${CMS_FIXTURE_SLUGS.promo}'], ['type'=>App\\Enums\\ContentPageType::PromoLanding,'title'=>'E2E Test Promo Landing','body'=>'<p>Promo body.</p>','status'=>App\\Enums\\PageStatus::Published,'published_at'=>now()->subDay(),'promotion_id'=>null]); ` +
      `App\\Models\\ContentPage::updateOrCreate(['slug'=>'${CMS_FIXTURE_SLUGS.page}'], ['type'=>App\\Enums\\ContentPageType::Page,'title'=>'E2E Test General Page','body'=>'<p>General page body.</p>','status'=>App\\Enums\\PageStatus::Published,'published_at'=>now()->subDay()]); ` +
      `echo 'ok';`
  );

  await revalidate([
    "content:blog_post",
    `content:blog_post:${CMS_FIXTURE_SLUGS.blogPublished}`,
    `content:blog_post:${CMS_FIXTURE_SLUGS.blogDraft}`,
    `content:blog_post:${CMS_FIXTURE_SLUGS.blogScheduled}`,
    "content:guide",
    `content:guide:${CMS_FIXTURE_SLUGS.guide}`,
    "content:location_page",
    `content:location_page:${CMS_FIXTURE_SLUGS.locationWithZone}`,
    "content:promo_landing",
    `content:promo_landing:${CMS_FIXTURE_SLUGS.promo}`,
    "content:page",
    `content:page:${CMS_FIXTURE_SLUGS.page}`,
  ]);
}

/**
 * Global (site-wide, `content_page_id IS NULL`) published FAQs across two
 * distinct categories — for `/faq`'s client-side-by-category grouping.
 * Deletes/recreates by question text (`Faq` has no unique/natural key to
 * `updateOrCreate` against) — idempotent in effect (always ends up with
 * exactly these four rows), safe to call repeatedly. Revalidates
 * `content:faq`/`content:faq:booking`/`content:faq:pricing` afterwards, same
 * self-healing reasoning as `seedContentPages()`.
 */
export async function seedGlobalFaqs(): Promise<void> {
  tinker(
    `App\\Models\\Faq::where('question','like','E2E FAQ %')->whereNull('content_page_id')->delete(); ` +
      `App\\Models\\Faq::factory()->published()->create(['question'=>'E2E FAQ booking Q1','answer'=>'E2E FAQ booking A1','category'=>'booking','sort_order'=>1]); ` +
      `App\\Models\\Faq::factory()->published()->create(['question'=>'E2E FAQ booking Q2','answer'=>'E2E FAQ booking A2','category'=>'booking','sort_order'=>2]); ` +
      `App\\Models\\Faq::factory()->published()->create(['question'=>'E2E FAQ pricing Q1','answer'=>'E2E FAQ pricing A1','category'=>'pricing','sort_order'=>1]); ` +
      `echo 'ok';`
  );

  await revalidate(["content:faq", "content:faq:booking", "content:faq:pricing"]);
}

/**
 * Location-page-scoped FAQ (`content_page_id` set) for the seeded
 * `e2e-test-location-richmond` page, exercising `<FaqBlock contentPageId>`
 * outside the PDP's `category="pdp"` case.
 */
export async function seedLocationScopedFaq(): Promise<void> {
  const out = tinker(
    `$page = App\\Models\\ContentPage::where('slug','${CMS_FIXTURE_SLUGS.locationWithZone}')->firstOrFail(); ` +
      `App\\Models\\Faq::where('content_page_id',$page->id)->delete(); ` +
      `App\\Models\\Faq::factory()->published()->create(['question'=>'E2E Location FAQ Q1','answer'=>'E2E Location FAQ A1','content_page_id'=>$page->id,'sort_order'=>1]); ` +
      `echo $page->id;`
  );
  const pageId = out.trim().split("\n").pop();

  await revalidate(["content:faq", `content:faq:page:${pageId}`]);
}

/**
 * Toggles every `category = "pdp"` FAQ's published state — used to exercise
 * both `<FaqBlock category="pdp">` branches (real content renders; zero
 * published rows renders nothing, not a broken empty state). `"pdp"` is a
 * single, reserved, site-wide category shared by every PDP
 * (`components/content/faq-block.tsx`'s own doc comment), so this can't be
 * varied per-tyre — tests instead visit two *different* PDP slugs, one
 * before and one after this toggle, so neither assertion depends on cache
 * invalidation timing (see the calling spec's own comment).
 *
 * Also revalidates `content:faq:pdp` itself — belt-and-braces on top of the
 * calling spec's own explicit webhook call (kept there too, deliberately,
 * since exercising `POST /api/revalidate` for real is part of what that
 * spec is demonstrating) — calling it twice for the same tag is a harmless
 * no-op, not a correctness risk.
 */
export async function setPdpFaqsPublished(published: boolean): Promise<void> {
  if (published) {
    tinker(
      `App\\Models\\Faq::where('question','like','E2E PDP FAQ %')->delete(); ` +
        `App\\Models\\Faq::factory()->published()->create(['question'=>'E2E PDP FAQ Q1','answer'=>'E2E PDP FAQ A1','category'=>'pdp','sort_order'=>1]); ` +
        `App\\Models\\Faq::factory()->published()->create(['question'=>'E2E PDP FAQ Q2','answer'=>'E2E PDP FAQ A2','category'=>'pdp','sort_order'=>2]); ` +
        `echo 'ok';`
    );
  } else {
    tinker(`App\\Models\\Faq::where('category','pdp')->delete(); echo 'ok';`);
  }

  await revalidate(["content:faq:pdp"]);
}
