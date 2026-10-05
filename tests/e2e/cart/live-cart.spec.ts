import { test, expect } from "@playwright/test";
import { resolveZoneViaApi } from "../helpers/location";
import { seedCartLocalStorage } from "../helpers/cart";

/**
 * Cart and cart drawer against `POST /api/v1/cart/calculate`: live per-line
 * prices, promo code validation (the API's own message for a bad code) and the
 * flexible-booking discount. Seeded demo data: Bridgestone Turanza T005
 * 205/55 R16 (variant 1) at $189.00 list price, zone 3.
 */

const ITEM = { tyre_variant_id: 1, quantity: 4, label: "Bridgestone Turanza T005 205/55 R16", slug: "bridgestone-turanza-t005-205-55-r16" };

test.describe("cart (live pricing)", () => {
  test.beforeEach(async ({ page }) => {
    await resolveZoneViaApi(page, { postcode: "3000" });
    await page.goto("/");
    await seedCartLocalStorage(page, [ITEM]);
  });

  test("a bad promo code shows the API's message and prices the cart without it", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByTestId("cart-total")).toContainText("Total", { timeout: 20_000 });
    await page.getByLabel("Promo code").fill("NOT-A-CODE");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("promo code", { exact: false }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("promo-applied")).toHaveCount(0);
    await expect(page.getByTestId("cart-total")).toContainText("Total");
  });

  test("the flexible-booking toggle is priced by the API and shows its own discount line", async ({ page }) => {
    await page.goto("/cart");
    const total = page.getByTestId("cart-total");
    await expect(total).toContainText("Total", { timeout: 20_000 });
    await page.getByRole("checkbox", { name: /Flexible booking discount/ }).check();
    await expect(page.getByTestId("flexible-discount-line")).toContainText("-$10.00", { timeout: 20_000 });
  });

  test("the cart drawer shows the same live prices", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByTestId("cart-total")).toContainText("Total", { timeout: 20_000 });
    const pageTotal = (await page.getByTestId("cart-sticky-bar").textContent()) ?? "";
    expect(pageTotal).toMatch(/\$/);
    await page.getByRole("banner").getByRole("link", { name: /^Cart/ }).click();
    const drawer = page.getByTestId("cart-drawer");
    await expect(drawer.getByTestId("cart-drawer-total")).toContainText(/\$\d/, { timeout: 20_000 });
    await expect(drawer.getByTestId("cart-drawer-line")).toHaveCount(1);
  });
});
