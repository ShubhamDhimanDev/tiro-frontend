import { test, expect } from "@playwright/test";
import { resolveZoneViaApi } from "../helpers/location";
import { seedCartLocalStorage } from "../helpers/cart";
import { createPercentagePromotion } from "../helpers/promotions";

/**
 * Cart-page promotion display (Phase 5) — `POST /api/v1/cart/calculate`
 * mode 1 (`{ zone_id, items }`), against a real, currently-active
 * `Promotion`/`PromotionEligibility` seeded via `tinker` (`PromotionFactory`/
 * `PromotionEligibilityFactory`'s own shape — see `helpers/promotions.ts`).
 * Deliberately needs no booking/technician/van fixtures at all — mode 1
 * prices a cart before any `Booking` exists, and this round's dispatch
 * confirmed none of the three required E2E flows need the known
 * vans/technicians/technician_shifts seeder gap.
 *
 * Real backend response, verified directly against a live
 * `POST /api/v1/cart/calculate` call before writing this spec (see PR
 * discussion / qa-lead handback): a 10%-off `Promotion` scoped to the PDP's
 * own seeded $189.00 variant (`bridgestone-turanza-t005-205-55-r16`,
 * `tyre_variant_id=1` in a freshly-seeded schema — same variant
 * `catalog/pdp.spec.ts` already uses for its own static-content assertions)
 * yields `discount_total=1890`, `grand_total=17010`,
 * `applied_promotions=[{id,name:"Spring 10% off",discount_amount:1890}]`,
 * matching `lib/cart/types.ts`'s documented shape exactly — no contract
 * mismatch found.
 */
test.describe("cart — promotion display", () => {
  test.beforeAll(() => {
    createPercentagePromotion({
      variantSlug: "bridgestone-turanza-t005-205-55-r16",
      name: "Spring 10% off",
      percentValue: 10,
    });
  });

  test("shows the promo badge on the affected line and the 'You saved $X' breakdown in the real DOM", async ({ page }) => {
    await resolveZoneViaApi(page, { postcode: "3000" });
    await page.goto("/");
    await seedCartLocalStorage(page, [
      { tyre_variant_id: 1, quantity: 1, label: "Bridgestone Turanza T005 205/55 R16", slug: "bridgestone-turanza-t005-205-55-r16" },
    ]);

    // `/cart` is live-priced (`POST /cart/calculate`): there is no separate "live" cart any more.
    await page.goto("/cart");

    // The per-line badge (`components/cart/cart-line-items.tsx`) and the
    // totals breakdown list (`components/cart/cart-totals.tsx`) both render
    // the promotion's name independently — exactly two occurrences, not one
    // merged element.
    await expect(page.getByText("Spring 10% off")).toHaveCount(2);

    // "You saved" replaces the plain "Discount" label once discount_total > 0.
    const savedRow = page.getByText("You saved").locator("..");
    await expect(savedRow).toBeVisible();
    await expect(page.getByText("Discount", { exact: true })).not.toBeVisible();

    // The real, server-computed dollar figures — not a client-side guess.
    // subtotal 18900c, discount_total 1890c (10% of $189.00), grand_total
    // 17010c — GST-inclusive convention, tax_total is informational only
    // (see docs/architecture/01-data-model.md), never added on top.
    await expect(savedRow).toContainText("-$18.90"); // the "You saved" row itself
    // Scoped to the totals `<dl>` specifically — the cart line item itself
    // is also an `<li>` containing "Spring 10% off" (its own badge), so a
    // bare `li` locator would match both and violate Playwright's strict
    // mode. The per-promotion breakdown list is nested inside
    // `<CartTotalsSummary>`'s `<dl>`; the cart line list is not.
    const breakdownLine = page.locator("dl li", { hasText: "Spring 10% off" });
    await expect(breakdownLine).toContainText("-$18.90"); // the per-promotion breakdown entry
    const totalRow = page.getByText("Total", { exact: true }).locator("..");
    await expect(totalRow).toContainText("$170.10"); // grand_total, not subtotal ($189.00)
  });
});
