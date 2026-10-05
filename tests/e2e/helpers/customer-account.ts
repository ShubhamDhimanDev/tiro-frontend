import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

/**
 * Test-only DB fixture creation for Phase 7's "saved addresses"/"order
 * history" E2E coverage, via `php artisan tinker --execute=...` — same
 * shelling-out posture as `helpers/promotions.ts`/`helpers/catalog.ts` (see
 * `helpers/promotions.ts`'s doc comment for why `execFileSync` with an argv
 * array, not a shell string, is used). Not idempotent, same reasoning as
 * `helpers/promotions.ts`: each spec run against a fresh
 * `scripts/test-db.sh`-created isolated schema starts empty. Do not call
 * this against the shared dev database.
 *
 * Exists specifically because two golden paths in this round's E2E coverage
 * need real backend rows a UI-driven flow can't practically produce in this
 * environment: `POST /api/v1/orders` requires a live Stripe secret key to
 * create a `PaymentIntent` (this workspace's `STRIPE_SECRET_KEY` is a
 * placeholder — see `components/checkout/stripe-payment-step.tsx`'s own doc
 * comment), so a real end-to-end "place an order, then see it referenced in
 * saved-address-delete's 409 case / in order history" walk can't be driven
 * through the actual checkout UI right now. These helpers create the same
 * *data shape* checkout would have produced (an `Order`+`Booking` owned by
 * the customer, an `Address` with `customer_id` set exactly as
 * `OrderController::createAddress()` sets it) directly, so the UI-facing
 * assertions under test (does the address list correctly refuse to hard-
 * delete a referenced address; does order history correctly render and link
 * to the existing detail page) are exercised for real against a real
 * backend response — only the "how the Order row came to exist" step is
 * substituted.
 *
 * `seedActivatedCustomer()` below is a second, independent substitution in
 * the same spirit, for a different reason: `helpers/fixtures.ts`'s
 * `registerAndActivateCustomer()` + `helpers/otp.ts`'s
 * `drainOtpQueueAndGetCode()` (`php artisan queue:work --queue=otp-mail,default
 * --stop-when-empty`) were written when `QUEUE_CONNECTION=database` (see
 * `helpers/otp.ts`'s own doc comment) — a per-schema-isolated queue table,
 * safe to drain from an isolated `scripts/test-db.sh` run. `backend/.env`
 * now sets `QUEUE_CONNECTION=redis`, and `config/database.php`'s
 * `REDIS_PREFIX` default (`Str::slug(APP_NAME).'-database-'`) is derived
 * from `APP_NAME`, not from `DB_DATABASE` — every backend process reading
 * the same `backend/.env` (this isolated one, and any other agent's own
 * `php artisan serve`/`queue:work` pointed at the shared dev DB) shares the
 * *same* Redis queue names. Draining `otp-mail,default` from an isolated
 * test run now risks consuming a job another agent's process queued for the
 * shared dev DB — the same class of cross-agent collision the 2026-09-11
 * MySQL incident was, just not yet an incident. Flagged in this round's
 * report, not silently worked around only here. `seedActivatedCustomer()`
 * sidesteps it entirely for every spec in this file that only needs *a*
 * signed-in customer (not to test registration/OTP itself): it creates an
 * already-`activated` `Customer` row directly (`CustomerFactory::activated()`
 * — real password hash, `email_verified_at` set) and logs in via the
 * existing password-login UI, no queue involved at all.
 */

const BACKEND_DIR = path.resolve(__dirname, "../../../../backend");

/** Fixed, known password for every customer `seedActivatedCustomer()` creates — mirrors `CustomerFactory::activated()`'s own default (`Hash::make('password')`), not a secret. */
export const SEEDED_CUSTOMER_PASSWORD = "password";

/**
 * Creates a real, already-activated `Customer` (verified email, real
 * password hash) directly via `CustomerFactory::activated()`, bypassing
 * registration/OTP entirely — see this file's doc comment for why. Returns
 * `email`/`password` for logging in via the real `/login` UI exactly as
 * `registerAndActivateCustomer()`'s callers already do.
 */
export function seedActivatedCustomer(labelForEmail: string): { email: string; password: string } {
  const email = `e2e-${labelForEmail}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
  tinker(`App\\Models\\Customer::factory()->activated()->create(['email'=>'${email}']); echo 'ok';`);
  return { email, password: SEEDED_CUSTOMER_PASSWORD };
}

function tinker(code: string): string {
  try {
    return execFileSync("php", ["artisan", "tinker", `--execute=${code}`], {
      cwd: BACKEND_DIR,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf-8",
    });
  } catch (err) {
    throw new Error(
      `Failed to run \`php artisan tinker --execute=...\` in ${BACKEND_DIR} for customer-account test-fixture setup. ` +
        `Is \`php\` on PATH and is this checkout's backend/ the one wired to the running Laravel instance ` +
        `(pointed at an isolated schema via \`scripts/test-db.sh\`, per root CLAUDE.md)?\n\n${String(err)}`
    );
  }
}

/** Scrapes the `___JSON___{...}___JSON___`-delimited payload a tinker script below echoes, out of tinker's own chattier stdout (which otherwise mixes in the PsySH prompt/return-value noise). */
function extractJson<T>(output: string): T {
  // `[\s\S]` instead of `.` + the `s` (dotAll) flag — this project's
  // `tsconfig.json` targets ES2017, which predates dotAll flag support.
  const match = output.match(/___JSON___([\s\S]+?)___JSON___/);
  if (!match) {
    throw new Error(`Couldn't find a ___JSON___...___JSON___ payload in tinker output:\n${output}`);
  }
  return JSON.parse(match[1]) as T;
}

/**
 * Creates a real `Address` owned by `customerEmail` (so it appears in
 * `GET /api/v1/customer/addresses`, exactly as one created via checkout
 * would) and a real, `confirmed` `Order`+`Booking` referencing it — the
 * exact "still referenced by an Order/Booking" shape
 * `AddressController::destroy()` checks for before allowing a hard delete.
 * Returns the address id so the caller can drive the UI's delete attempt
 * against a known row.
 */
export function seedAddressReferencedByOrder(customerEmail: string, opts: { addressLabel?: string } = {}): { addressId: number; orderId: number; orderNumber: string } {
  const label = (opts.addressLabel ?? "Referenced Address").replace(/'/g, "\\'");
  const output = tinker(
    `$c = App\\Models\\Customer::where('email','${customerEmail}')->firstOrFail(); ` +
      `$address = App\\Models\\Address::factory()->create(['customer_id'=>$c->id,'type'=>App\\Enums\\AddressType::Fitting,'label'=>'${label}','is_default'=>true]); ` +
      `$order = App\\Models\\Order::factory()->confirmed()->create(['customer_id'=>$c->id,'address_id'=>$address->id]); ` +
      `echo '___JSON___'.json_encode(['addressId'=>$address->id,'orderId'=>$order->id,'orderNumber'=>$order->order_number]).'___JSON___';`
  );
  return extractJson(output);
}

/**
 * Creates `count` real, `confirmed` `Order`+`Booking` rows owned by
 * `customerEmail`, each with a distinct `placed_at` (oldest first in
 * creation order, so the newest-created is the most recent) — enough to
 * exercise `GET /api/v1/customer/orders`'s `placed_at`-descending sort and
 * confirm the account order-history list renders real data and links
 * correctly into the existing `/orders/{id}` detail page.
 */
export function seedOrdersForCustomer(customerEmail: string, count = 2): Array<{ orderId: number; orderNumber: string }> {
  const output = tinker(
    `$c = App\\Models\\Customer::where('email','${customerEmail}')->firstOrFail(); ` +
      `$rows = []; ` +
      `for ($i = 0; $i < ${count}; $i++) { ` +
      `$order = App\\Models\\Order::factory()->confirmed()->create(['customer_id'=>$c->id,'placed_at'=>now()->subDays(${count} - $i)]); ` +
      `$rows[] = ['orderId'=>$order->id,'orderNumber'=>$order->order_number]; ` +
      `} ` +
      `echo '___JSON___'.json_encode($rows).'___JSON___';`
  );
  return extractJson(output);
}

/**
 * Creates a real `pending_hold` `Booking` (with one `BookingLineItem`, so
 * `cart/calculate`'s booking-summary mode has something real to price) —
 * enough for `/checkout?booking={id}` to load successfully. Substitutes for
 * driving the full cart → booking-hold UI flow, which this suite's other
 * specs (`tests/e2e/cart/**`, once a booking-flow spec exists) already
 * cover independently; this helper exists only to get a valid `pending_hold`
 * booking id for checkout-prefill assertions, not to re-test slot booking.
 *
 * `customerEmail: null` seeds a genuine guest booking (`customer_id` null)
 * with a known raw `manage_token` (returned here so the caller can set the
 * same `mts_booking_manage_tokens` cookie shape `app/api/booking/route.ts`
 * itself would have set after a real guest booking-hold — see
 * `lib/booking/manage-token-cookie.ts`) — `customerEmail` set instead seeds
 * the booking already owned by that customer, exactly as a signed-in
 * customer's own booking-hold would be.
 */
export function seedPendingHoldBooking(customerEmail: string | null): { bookingId: number; manageToken: string | null } {
  const manageToken = customerEmail ? null : `e2e-manage-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const customerLine = customerEmail
    ? `$c = App\\Models\\Customer::where('email','${customerEmail}')->firstOrFail(); $attrs['customer_id'] = $c->id; `
    : `$attrs['manage_token_hash'] = App\\Models\\Booking::hashManageToken('${manageToken}'); `;
  const output = tinker(
    `$attrs = ['status'=>App\\Enums\\BookingStatus::PendingHold,'hold_expires_at'=>now()->addMinutes(15)]; ` +
      customerLine +
      `$booking = App\\Models\\Booking::factory()->create($attrs); ` +
      `App\\Models\\BookingLineItem::factory()->for($booking)->create(); ` +
      `echo '___JSON___'.json_encode(['bookingId'=>$booking->id]).'___JSON___';`
  );
  const { bookingId } = extractJson<{ bookingId: number }>(output);
  return { bookingId, manageToken };
}

/**
 * Sets the same httpOnly `mts_booking_manage_tokens` cookie shape
 * `app/api/booking/route.ts` sets after a real guest booking-hold response
 * (`{ [bookingId]: manageToken }`, JSON, URI-component-encoded) directly via
 * the browser context — a substitute for actually driving a guest booking-
 * hold through the UI (see `seedPendingHoldBooking()`'s doc comment for
 * why). `httpOnly` isn't reproducible from `document.cookie`, but that
 * distinction doesn't matter for a test driving the same origin's own pages
 * — only that the cookie's name, value, and path (the parts the server-side
 * `cookies()` read later expects) are present.
 */
export async function setGuestBookingManageTokenCookie(page: Page, bookingId: number, manageToken: string): Promise<void> {
  await page.context().addCookies([
    {
      name: "mts_booking_manage_tokens",
      value: encodeURIComponent(JSON.stringify({ [String(bookingId)]: manageToken })),
      url: page.url(),
    },
  ]);
}

/**
 * Logs in via the real password-login UI — same two-step "seed server-side,
 * then log in through the UI" pattern `tests/e2e/price-guarantee/claims.spec.ts`
 * established for `registerAndActivateCustomer`, reused here for
 * `seedActivatedCustomer`.
 *
 * Retries the submit itself up to twice: `PasswordLoginThrottleService`
 * reads the login-attempt count from `CACHE_STORE=redis`, and this Redis
 * connection was observed, while writing this suite, to intermittently
 * throw `Predis\Connection\ConnectionException: Stream is already at the
 * end` on a backend process's *first* Redis-touching request after startup
 * (self-recovers on retry every time it was observed — not a Phase 7
 * regression, a pre-existing local Predis/Windows connection-warmup quirk,
 * flagged in this round's report rather than silently papered over only
 * here). Surfaces as a generic alert on the login form, not a thrown
 * exception in this helper, so detecting it means checking for that alert
 * and retrying the same submit rather than catching an error.
 */
export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    try {
      await expect(page).toHaveURL("/", { timeout: 15_000 });
      await expect(page.getByText(/^Hi, /)).toBeVisible({ timeout: 20_000 });
      return;
    } catch (err) {
      if (attempt === 3) throw err;
    }
  }
}
