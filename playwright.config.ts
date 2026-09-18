import { defineConfig, devices } from "@playwright/test";

/**
 * E2E coverage for the storefront, run as one suite since every spec shares
 * the same real backend/dev-server prerequisites below:
 *   - customer-auth (`tests/e2e/auth/**`): registration, login via each
 *     independent method, password reset — see docs/plan/01-task-breakdown.md's
 *     Phase 0 "Test coverage: storefront E2E" row and
 *     docs/architecture/08-customer-auth-otp.md.
 *   - location/serviceability + catalogue/search/browse/PDP
 *     (`tests/e2e/location/**`, `tests/e2e/catalog/**`, Phase 1): see
 *     frontend/CLAUDE.md's "Location/serviceability + catalogue/search/
 *     browse/PDP (Phase 1)" section and docs/architecture/02-api-contract.md.
 *
 * Manual prerequisites — nothing in this file starts these for you, and
 * there is no CI to run this suite automatically (root CLAUDE.md):
 *
 *   1. The Laravel backend running and reachable at LARAVEL_API_URL
 *      (default http://localhost:8000) — e.g. `php artisan serve` from
 *      `backend/`, migrated and seeded (`php artisan migrate:fresh --seed`
 *      — the catalog/location specs assert against `CatalogueSeeder`/
 *      `LocationSeeder`'s specific seed data, e.g. exact suburb/postcode ->
 *      zone resolutions and known variant sizes/prices, not arbitrary
 *      fixtures). `tests/e2e/global-setup.ts` checks reachability up front
 *      and fails fast with a clear message if it isn't.
 *   2. None of `AUTH_BACKEND` / `LOCATION_BACKEND` / `CATALOG_BACKEND` may be
 *      `stub` — live is the default for all three now (AUTH_BACKEND as of
 *      2026-09-10, LOCATION_BACKEND/CATALOG_BACKEND as of 2026-09-11; see
 *      frontend/CLAUDE.md), so no `.env.local` override is needed for this
 *      any more. Only relevant if something in the environment/`.env*`
 *      files explicitly sets one of these to `stub` — that would make the
 *      corresponding specs silently exercise the stub instead of
 *      backend-agent's real endpoints.
 *   3. `php` on PATH, and this checkout's `../backend` reachable from
 *      `frontend/`:
 *      - specs that need a real OTP code (registration, OTP login,
 *        password reset) shell out to
 *        `php artisan queue:work --queue=otp-mail,default --stop-when-empty`
 *        (see tests/e2e/helpers/otp.ts) to drain the queue and scrape the
 *        code out of `backend/storage/logs/laravel.log` (MAIL_MAILER=log
 *        locally) — a scripted version of the manual workaround
 *        frontend-agent used for its own testing, NOT a substitute for a
 *        real persistent queue worker (Redis isn't wired up locally yet,
 *        QUEUE_CONNECTION=database).
 *      - the PDP stock_status spec shells out to `php artisan tinker
 *        --execute=...` (see tests/e2e/helpers/catalog.ts) to mutate a
 *        handful of otherwise-unused seeded variants' inventory, since the
 *        seed data alone never produces anything but `in_stock`.
 *
 * The Next.js dev server itself is more forgiving: `webServer` below reuses
 * one already running at baseURL, or starts `npm run dev` if none is found
 * — but note that a server started *for you* this way inherits whatever
 * `LOCATION_BACKEND`/`CATALOG_BACKEND`/`AUTH_BACKEND` are set to in the
 * environment/`.env*` files at that point, per point 2 above.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",

  // Every spec shares the same real backend, the same per-IP OTP/login
  // rate-limit buckets, and the same `backend/storage/logs/laravel.log`
  // file that the queue-drain helper both writes to (via the mail send)
  // and reads from. Running specs concurrently risks two workers racing
  // `php artisan queue:work` against that one log file at the same moment.
  // This suite is not perf-sensitive enough for that risk to be worth it.
  workers: 1,
  fullyParallel: false,

  retries: 0,
  timeout: 30_000,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
