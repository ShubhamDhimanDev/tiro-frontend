import { test, expect } from "@playwright/test";
import { seedReviews, REVIEW_FIXTURES } from "../helpers/reviews";
import { readFrontendEnvLocal } from "../helpers/env";

/**
 * Phase 8 Reviews storefront UI — homepage widget + `/reviews` full listing.
 * Exercises the real Laravel backend end-to-end (`lib/reviews/backend.ts`
 * defaults to live, no `REVIEWS_BACKEND=stub` override anywhere in this
 * checkout's `.env*` files — confirmed by the qa-lead brief and re-confirmed
 * here behaviourally, not just by reading source).
 *
 * `seedReviews()` (`../helpers/reviews.ts`) seeds one distinctively-named
 * review (`REVIEW_FIXTURES.distinctiveAuthorName`/`distinctiveBody` — text
 * that does not appear anywhere in `lib/reviews/fixtures.ts`'s stub data) and
 * one review with `body: null` AND `review_url: null` — the exact
 * nullability case the Phase 8 follow-up fix-pass
 * (frontend/CLAUDE.md, 2026-09-26) targeted. Both are pinned to the most
 * recent `published_at`, so they always land on page 1 regardless of how
 * many other rows exist in whatever DB this suite runs against.
 */

const REVALIDATE_SECRET = readFrontendEnvLocal("REVALIDATE_WEBHOOK_SECRET");

test.describe("Reviews (Phase 8)", () => {
  test.beforeAll(async ({ request }) => {
    await seedReviews();
    const res = await request.post("/api/revalidate", {
      headers: { "X-Revalidate-Secret": REVALIDATE_SECRET, "Content-Type": "application/json" },
      data: { tags: ["reviews"] },
    });
    expect(res.status()).toBe(200);
  });

  test("homepage renders the aggregate rating badge and a carousel of real reviews", async ({ page }) => {
    await page.goto("/");

    // Aggregate rating badge — a number followed by "Google review(s)".
    await expect(page.getByText(/Google reviews?/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Read all reviews" })).toHaveAttribute("href", "/reviews");

    // The carousel renders the real, distinctively-named seeded review —
    // proof this is the live backend, not lib/reviews/fixtures.ts's stub
    // data (none of which contains this text).
    await expect(page.getByText(REVIEW_FIXTURES.distinctiveAuthorName)).toBeVisible();
    await expect(page.getByText(REVIEW_FIXTURES.distinctiveBody)).toBeVisible();

    // Organization + nested AggregateRating structured data really present.
    const ldJsonTexts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const org = ldJsonTexts.map((t) => JSON.parse(t)).find((d) => d["@type"] === "Organization");
    expect(org).toBeTruthy();
    expect(org.aggregateRating["@type"]).toBe("AggregateRating");
    expect(org.aggregateRating.reviewCount).toBeGreaterThan(0);
  });

  test("/reviews lists real reviews, confirms live-backend wiring, and renders a null body/review_url row cleanly", async ({
    page,
  }) => {
    await page.goto("/reviews");
    await expect(page.getByRole("heading", { name: "Customer reviews" })).toBeVisible();

    // The distinctive, live-backend-only review is present.
    await expect(page.getByText(REVIEW_FIXTURES.distinctiveAuthorName)).toBeVisible();
    await expect(page.getByText(REVIEW_FIXTURES.distinctiveBody)).toBeVisible();

    // Never silently still serving the stub: none of lib/reviews/fixtures.ts's
    // own distinctive stub-only author names appear anywhere on the page.
    await expect(page.getByText("J. Smith", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Great service, turned up right on time")).toHaveCount(0);

    // The null-body/null-review_url review renders cleanly: author name
    // present, but no dead `<a href="">` "View on Google" link scoped to
    // its own card, and no broken/empty paragraph in its place.
    const nullFieldsCard = page
      .locator("article", { hasText: REVIEW_FIXTURES.nullFieldsAuthorName })
      .first();
    await expect(nullFieldsCard).toBeVisible();
    await expect(nullFieldsCard.getByRole("link")).toHaveCount(0);
    const paragraphs = await nullFieldsCard.locator("p").allTextContents();
    for (const text of paragraphs) {
      expect(text.trim().length).toBeGreaterThan(0);
    }

    // Aggregate rating badge + Organization/AggregateRating structured data.
    await expect(page.getByText(/Google reviews?/)).toBeVisible();
    const ldJsonTexts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = ldJsonTexts.map((t) => JSON.parse(t));
    expect(parsed.find((d) => d["@type"] === "Organization")).toBeTruthy();
    const breadcrumb = parsed.find((d) => d["@type"] === "BreadcrumbList");
    expect(breadcrumb).toBeTruthy();
    expect(breadcrumb.itemListElement.at(-1).name).toBe("Reviews");
  });

  test("/reviews pagination — Next/Previous move between pages without losing content", async ({ page }) => {
    await page.goto("/reviews");

    // seedReviews() guarantees at least 12 visible rows, i.e. more than one
    // page at the documented per_page=10 default.
    await expect(page.getByRole("navigation", { name: "Reviews pagination" }).locator('[aria-current="page"]')).toHaveText("1");
    const nextLink = page.getByRole("link", { name: "Next" });
    await expect(nextLink).toBeVisible();
    await expect(page.getByRole("link", { name: "Previous" })).toHaveCount(0);

    await nextLink.click();
    await expect(page).toHaveURL(/\/reviews\?page=2/);
    await expect(page.getByRole("navigation", { name: "Reviews pagination" }).locator('[aria-current="page"]')).toHaveText("2");
    await expect(page.getByRole("link", { name: "Previous" })).toBeVisible();

    await page.getByRole("link", { name: "Previous" }).click();
    await expect(page).toHaveURL(/\/reviews\?page=1/);
    await expect(page.getByRole("navigation", { name: "Reviews pagination" }).locator('[aria-current="page"]')).toHaveText("1");
  });
});
