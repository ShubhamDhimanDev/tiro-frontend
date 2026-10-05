import { test, expect } from "@playwright/test";
import { seedContentPages, CMS_FIXTURE_SLUGS } from "../helpers/content";

/**
 * General static `page`-type `ContentPage` detail, routed under
 * `/pages/{slug}` (not a bare root-level `/{slug}` — see
 * `app/pages/[slug]/page.tsx`'s doc comment for the routing judgment call).
 */

test.describe("General static page detail", () => {
  test.beforeAll(async () => {
    await seedContentPages();
  });

  test("renders static content", async ({ page }) => {
    const res = await page.goto(`/pages/${CMS_FIXTURE_SLUGS.page}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "E2E Test General Page" })).toBeVisible();
    await expect(page.getByText("General page body.")).toBeVisible();
  });

  test("an unknown page slug 404s", async ({ page }) => {
    const res = await page.goto("/pages/not-a-real-page-slug");
    expect(res?.status()).toBe(404);
  });
});
