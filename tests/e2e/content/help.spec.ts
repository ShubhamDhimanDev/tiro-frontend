import { test, expect } from "@playwright/test";
import { seedContentPages, seedGlobalFaqs, CMS_FIXTURE_SLUGS } from "../helpers/content";

/**
 * `/help` — Help Centre index (Phase 8, `app/help/page.tsx`). Not a new
 * backend build (frontend/CLAUDE.md): reuses the exact same
 * `GET /api/v1/content/pages?type=guide` / `GET /api/v1/content/faqs` reads
 * and fixtures `content/guides.spec.ts`/`content/faq.spec.ts` already seed
 * via `seedContentPages()`/`seedGlobalFaqs()` — no new fixture helper
 * needed for this spec.
 */

test.describe("/help — Help Centre index", () => {
  test.beforeAll(async () => {
    await seedContentPages();
    await seedGlobalFaqs();
  });

  test("shows guides and FAQs grouped by category in two separate sections", async ({ page }) => {
    await page.goto("/help");
    await expect(page.getByRole("heading", { name: "Help Centre", exact: true })).toBeVisible();

    // Guides section — the seeded "buying-guide"-category guide, rendered
    // under its own category heading. `getByText("buying guide")` alone is
    // a Playwright strict-mode violation here — it also matches the
    // ContentSummaryCard's own per-card category label (a second, different
    // element with the identical text) — so this scopes to the section
    // heading specifically via its `<h3>` role.
    await expect(page.getByRole("heading", { name: "Guides", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "buying guide", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /E2E Test Guide/ })).toBeVisible();

    // FAQs section — the seeded booking/pricing-category global FAQs,
    // rendered under their own (separate) category headings, with the
    // actual Q&A embedded directly rather than only linked to.
    await expect(page.getByRole("heading", { name: "Frequently asked questions", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "booking", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "pricing", exact: true })).toBeVisible();
    await expect(page.getByText("E2E FAQ booking Q1")).toBeVisible();
    // Answers sit in the design-v2 accordion: collapsed until the question is opened.
    await page.getByRole("button", { name: "E2E FAQ booking Q1" }).click();
    await expect(page.getByText("E2E FAQ booking A1")).toBeVisible();
    await expect(page.getByText("E2E FAQ pricing Q1")).toBeVisible();

    // FAQPage structured data for the embedded FAQ items.
    const ldJsonTexts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = ldJsonTexts.map((t) => JSON.parse(t));
    const faqJsonLd = parsed.find((d) => d["@type"] === "FAQPage");
    expect(faqJsonLd).toBeTruthy();
    const questionNames = faqJsonLd.mainEntity.map((q: { name: string }) => q.name);
    expect(questionNames).toEqual(expect.arrayContaining(["E2E FAQ booking Q1", "E2E FAQ pricing Q1"]));

    // BreadcrumbList structured data.
    const breadcrumb = parsed.find((d) => d["@type"] === "BreadcrumbList");
    expect(breadcrumb).toBeTruthy();
    expect(breadcrumb.itemListElement.at(-1).name).toBe("Help Centre");
  });

  test("links out to /guides and /faq for the full lists, and both resolve", async ({ page }) => {
    await page.goto("/help");

    await expect(page.getByRole("link", { name: "View all guides" })).toHaveAttribute("href", "/guides");
    await expect(page.getByRole("link", { name: "View full FAQ" })).toHaveAttribute("href", "/faq");

    await page.getByRole("link", { name: "View all guides" }).click();
    await expect(page).toHaveURL("/guides", { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Guides", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /E2E Test Guide/ })).toBeVisible();

    await page.goto("/help");
    await page.getByRole("link", { name: "View full FAQ" }).click();
    await expect(page).toHaveURL("/faq", { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Frequently asked questions", exact: true })).toBeVisible();
  });

  test("the guide card links through to the real guide detail page", async ({ page }) => {
    await page.goto("/help");
    await page.getByRole("link", { name: /E2E Test Guide/ }).click();
    await expect(page).toHaveURL(`/guides/${CMS_FIXTURE_SLUGS.guide}`, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "E2E Test Guide" })).toBeVisible();
  });
});
