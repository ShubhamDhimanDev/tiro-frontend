import { test, expect } from "@playwright/test";
import { seedContentPages, CMS_FIXTURE_SLUGS } from "../helpers/content";

/**
 * Promo-landing page detail (`app/promotions/[slug]/page.tsx`) — this
 * fixture has no linked `Promotion` (`promotion_id: null`), so only the
 * static-content render path is exercised here; the double-tagging /
 * `promotion:{id}` behaviour when a `Promotion` *is* linked is a documented,
 * flagged limitation in that file's own doc comment, not independently
 * re-verified by this spec.
 */

test.describe("Promo landing page detail", () => {
  test.beforeAll(async () => {
    await seedContentPages();
  });

  test("renders static content", async ({ page }) => {
    const res = await page.goto(`/promotions/${CMS_FIXTURE_SLUGS.promo}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "E2E Test Promo Landing" })).toBeVisible();
    await expect(page.getByText("Promo body.")).toBeVisible();
  });

  test("an unknown promo slug 404s", async ({ page }) => {
    const res = await page.goto("/promotions/not-a-real-promo-slug");
    expect(res?.status()).toBe(404);
  });
});
