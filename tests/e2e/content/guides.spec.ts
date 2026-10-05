import { test, expect } from "@playwright/test";
import { seedContentPages, CMS_FIXTURE_SLUGS } from "../helpers/content";

/**
 * Guides listing -> detail navigation — same shape as `blog.spec.ts`, per
 * `app/guides/page.tsx`'s own doc comment ("same shape/judgment calls as
 * `app/blog/page.tsx`").
 */

test.describe("Guides listing -> detail", () => {
  test.beforeAll(async () => {
    await seedContentPages();
  });

  test("listing links to a published guide, and the guide renders its content", async ({ page }) => {
    await page.goto("/guides");
    await expect(page.getByRole("heading", { name: "Guides", exact: true })).toBeVisible();

    const card = page.getByRole("link", { name: /E2E Test Guide/ });
    await expect(card).toBeVisible();
    await card.click();

    // See blog.spec.ts's identical comment: generous timeout for a
    // client-side navigation to a route this dev server may not have
    // compiled a client bundle for yet.
    await expect(page).toHaveURL(`/guides/${CMS_FIXTURE_SLUGS.guide}`, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "E2E Test Guide" })).toBeVisible();
    await expect(page.getByText("A guide excerpt.")).toBeVisible();
    await expect(page.getByText("Guide body.")).toBeVisible();
  });
});
