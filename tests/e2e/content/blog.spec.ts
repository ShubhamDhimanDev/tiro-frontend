import { test, expect } from "@playwright/test";
import { seedContentPages, CMS_FIXTURE_SLUGS } from "../helpers/content";

/**
 * Blog listing -> detail navigation, and the draft/scheduled 404 visibility
 * rule (`ContentPage::scopePublished()`, frontend/CLAUDE.md's Content (CMS)
 * & ISR section) — exercised through a real browser render, not just an API
 * status check, since `notFound()` rendering correctly (not a broken/blank
 * page) is exactly what's being verified here.
 */

test.describe("Blog listing -> detail", () => {
  test.beforeAll(async () => {
    await seedContentPages();
  });

  test("listing links to a published post, and the post renders its content", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: "Blog", exact: true })).toBeVisible();

    const card = page.getByRole("link", { name: /E2E Test Blog Post/ });
    await expect(card).toBeVisible();
    await card.click();

    // Generous timeout, not Playwright's 5s `expect` default: this is a
    // client-side navigation to a dynamic route this Turbopack dev server
    // may never have compiled a client bundle for yet — first-compile can
    // genuinely take several seconds longer than the default assertion
    // timeout, same reality every other first-visit in this suite
    // sidesteps by using `page.goto()`'s own generous navigation timeout
    // instead of `expect`'s.
    await expect(page).toHaveURL(`/blog/${CMS_FIXTURE_SLUGS.blogPublished}`, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "E2E Test Blog Post" })).toBeVisible();
    await expect(page.getByText("An E2E test blog excerpt.")).toBeVisible();
    await expect(page.getByText("E2E blog body.")).toBeVisible();

    // BreadcrumbList structured data really present in the rendered HTML.
    const ldJsonTexts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const breadcrumb = ldJsonTexts.map((t) => JSON.parse(t)).find((d) => d["@type"] === "BreadcrumbList");
    expect(breadcrumb).toBeTruthy();
    expect(breadcrumb.itemListElement.at(-1).name).toBe("E2E Test Blog Post");
  });

  test("a draft ContentPage 404s on the public route despite existing in the DB", async ({ page }) => {
    const res = await page.goto(`/blog/${CMS_FIXTURE_SLUGS.blogDraft}`);
    expect(res?.status()).toBe(404);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
    // Never leaks the draft's own title into a broken render.
    await expect(page.getByText("E2E Test Blog Draft")).toHaveCount(0);
  });

  test("a ContentPage published with a future published_at (scheduled) 404s on the public route", async ({
    page,
  }) => {
    const res = await page.goto(`/blog/${CMS_FIXTURE_SLUGS.blogScheduled}`);
    expect(res?.status()).toBe(404);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
    await expect(page.getByText("E2E Test Blog Scheduled")).toHaveCount(0);
  });

  test("an entirely unknown slug also 404s", async ({ page }) => {
    const res = await page.goto("/blog/not-a-real-post-slug");
    expect(res?.status()).toBe(404);
  });
});
