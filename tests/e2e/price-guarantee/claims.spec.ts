import { test, expect } from "@playwright/test";
import { registerAndActivateCustomer } from "../helpers/fixtures";
import { seedPriceGuaranteeClaims } from "../helpers/promotions";

/**
 * Price-guarantee claim flows (Phase 5) — against the real
 * `POST/GET /api/v1/price-guarantee-claims` endpoints (`auth:customer`-only,
 * no guest path — see `lib/price-guarantee/types.ts`'s doc comment), a real
 * seeded `Customer`, and real `PriceGuaranteeClaim` rows via
 * `PriceGuaranteeClaimFactory` (`helpers/promotions.ts#seedPriceGuaranteeClaims`).
 * Needs no booking/technician/van fixtures at all — a price-guarantee claim
 * only ever references a `Customer` + `TyreVariant`(+ optionally an `Order`),
 * never a `Booking`.
 *
 * `registerAndActivateCustomer` (via the standalone `request` fixture, not
 * `page.request`) only creates the account server-side — it does not attach
 * the resulting session cookie to `page`'s own browser context, so each test
 * below still logs in through the real UI afterward, same two-step pattern
 * `auth/login-password.spec.ts` already established.
 */

async function loginViaUi(page: import("@playwright/test").Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByText(/^Hi, /)).toBeVisible();
}

test.describe("price-guarantee claim submission", () => {
  test("an authenticated customer submits a claim and sees the success state", async ({ page, request }) => {
    const { email, password } = await registerAndActivateCustomer(request, "pg-claim-submit");
    await loginViaUi(page, email, password);

    // Direct navigation with a pre-filled tyre_variant_id/label query string
    // — the same context a PDP's "Found it cheaper?" link
    // (`components/catalog/pdp-price-match-link.tsx`) would provide.
    await page.goto(
      "/price-guarantee-claims/new?tyre_variant_id=1&label=" + encodeURIComponent("Bridgestone Turanza T005 205/55 R16")
    );

    await expect(page.getByText(/Claiming a price match for/)).toBeVisible();
    await expect(page.getByText("Bridgestone Turanza T005 205/55 R16")).toBeVisible();

    await page.getByLabel("Competitor's product URL").fill("https://rival-tyres.example.com/turanza-t005");
    await page.getByLabel("Competitor's price (AUD)").fill("169.00");
    await page.getByRole("button", { name: "Submit claim" }).click();

    await expect(page.getByText(/Your price-match claim has been submitted/)).toBeVisible();
    await expect(page.getByRole("link", { name: "View your claims" })).toHaveAttribute(
      "href",
      "/price-guarantee-claims"
    );

    // Confirm it round-tripped through the real backend for real: follow the
    // link and see the just-submitted claim show up pending review.
    await page.getByRole("link", { name: "View your claims" }).click();
    await expect(page).toHaveURL("/price-guarantee-claims");
    await expect(page.getByText("Pending review")).toBeVisible();
    await expect(page.getByText(/\$169\.00/)).toBeVisible();
  });
});

test.describe("price-guarantee claims list — status rendering", () => {
  test("shows one claim in each of pending/approved/rejected status, with the right per-status detail", async ({
    page,
    request,
  }) => {
    const { email, password } = await registerAndActivateCustomer(request, "pg-claims-list");
    // Not redeemed — exercises the "apply it before {date}" branch of the
    // approved claim's 3-way trailing text, not the "already applied" one.
    seedPriceGuaranteeClaims(email, "bridgestone-turanza-t005-205-55-r16", { redeemApproved: false });

    await loginViaUi(page, email, password);
    await page.goto("/price-guarantee-claims");

    await expect(page.getByText("Pending review")).toBeVisible();
    await expect(page.getByText("Approved", { exact: true })).toBeVisible();
    await expect(page.getByText("Rejected", { exact: true })).toBeVisible();

    // Approved claim: PriceGuaranteeClaimFactory::approved(2000) -> $20.00,
    // not redeemed, with an expires_at 30 days out -> the "apply it before"
    // branch, not "already applied".
    await expect(page.getByText(/Approved discount: \$20\.00 — apply it to an order before/)).toBeVisible();
    await expect(page.getByText(/already applied/)).not.toBeVisible();

    // Rejected claim: PriceGuaranteeClaimFactory::rejected()'s own default
    // admin_note.
    await expect(page.getByText("Reason: Not a matching competitor listing.")).toBeVisible();

    // Every claim links out to its own competitor listing.
    await expect(page.getByRole("link", { name: "view listing" }).first()).toBeVisible();
  });
});
