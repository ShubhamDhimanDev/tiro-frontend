import { test, expect } from "@playwright/test";
import { seedGlobalFaqs, setPdpFaqsPublished } from "../helpers/content";
import { readFrontendEnvLocal } from "../helpers/env";

/**
 * General `/faq` page's client-side-by-category grouping
 * (`app/faq/page.tsx`), and the shared `<FaqBlock category="pdp">` on the
 * PDP (`app/tyres/[slug]/page.tsx`) in both its "content present" and
 * "zero published rows" states.
 *
 * **Cache-key gotcha, worth documenting explicitly**: `<FaqBlock
 * category="pdp">`'s own fetch (`GET /api/v1/content/faqs?category=pdp`) is
 * the *same URL* no matter which PDP renders it — Next's fetch Data Cache
 * keys on the request (URL + options), not on the page route that issued
 * it. So visiting two different, previously-unvisited tyre PDPs is *not*
 * enough on its own to get two independent fetches of this one shared
 * block: whichever PDP hits it first "wins" the cache entry for every PDP
 * thereafter, for the whole `revalidate: 3600` window. This spec instead
 * revalidates the `content:faq:pdp` tag via the real
 * `POST /api/revalidate` webhook (`app/api/revalidate/route.ts`) between
 * the two states, exactly like `NotifyFrontendRevalidation` would after an
 * admin publishes/unpublishes a `pdp`-category FAQ — a real exercise of the
 * webhook, not a workaround invented only for this test.
 */

const REVALIDATE_SECRET = readFrontendEnvLocal("REVALIDATE_WEBHOOK_SECRET");
const PDP_SLUG_NO_FAQS = "bridgestone-turanza-t005-205-55-r16";
const PDP_SLUG_WITH_FAQS = "bridgestone-dueler-at-001-235-60-r18";

test.describe("General /faq page grouping", () => {
  test.beforeAll(async () => {
    await seedGlobalFaqs();
  });

  test("groups 2+ categories client-side, each with its own questions", async ({ page }) => {
    await page.goto("/faq");
    await expect(page.getByRole("heading", { name: "Frequently asked questions", exact: true })).toBeVisible();

    await expect(page.getByRole("heading", { name: "booking" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "pricing" })).toBeVisible();

    await expect(page.getByText("E2E FAQ booking Q1")).toBeVisible();
    await expect(page.getByText("E2E FAQ booking Q2")).toBeVisible();
    await expect(page.getByText("E2E FAQ pricing Q1")).toBeVisible();

    const ldJsonTexts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const faqJsonLd = ldJsonTexts.map((t) => JSON.parse(t)).find((d) => d["@type"] === "FAQPage");
    expect(faqJsonLd).toBeTruthy();
    const questionNames = faqJsonLd.mainEntity.map((q: { name: string }) => q.name);
    expect(questionNames).toEqual(
      expect.arrayContaining(["E2E FAQ booking Q1", "E2E FAQ booking Q2", "E2E FAQ pricing Q1"])
    );
  });
});

test.describe("Shared FaqBlock on the PDP (category=\"pdp\")", () => {
  test.describe.configure({ mode: "serial" });

  test("renders nothing (no broken empty state) when there are zero published pdp-category FAQs", async ({
    page,
    request,
  }) => {
    await setPdpFaqsPublished(false);
    // Bust any stale cached `content:faq:pdp` fetch from an earlier PDP
    // visit elsewhere in this suite (e.g. `catalog/pdp.spec.ts` visiting the
    // same PDP route type) — see the file doc comment.
    await request.post("/api/revalidate", {
      headers: { "X-Revalidate-Secret": REVALIDATE_SECRET, "Content-Type": "application/json" },
      data: { tags: ["content:faq:pdp"] },
    });

    await page.goto(`/tyres/${PDP_SLUG_NO_FAQS}`);
    await expect(page.getByRole("heading", { name: "Frequently asked questions" })).toHaveCount(0);
    // The PDP itself still renders fine around the block's absence.
    await expect(page.getByRole("heading", { name: "Turanza T005" })).toBeVisible();
  });

  test("renders real FAQ content when published pdp-category FAQs exist", async ({ page, request }) => {
    await setPdpFaqsPublished(true);
    // Same cache-key gotcha as above, in reverse: without this, the
    // previous test's now-stale "empty" result would still be served here.
    const revalidateRes = await request.post("/api/revalidate", {
      headers: { "X-Revalidate-Secret": REVALIDATE_SECRET, "Content-Type": "application/json" },
      data: { tags: ["content:faq:pdp"] },
    });
    expect(revalidateRes.status()).toBe(200);

    await page.goto(`/tyres/${PDP_SLUG_WITH_FAQS}`);
    await expect(page.getByRole("heading", { name: "Frequently asked questions" })).toBeVisible();
    await expect(page.getByText("E2E PDP FAQ Q1")).toBeVisible();
    await expect(page.getByText("E2E PDP FAQ A1")).toBeVisible();
    await expect(page.getByText("E2E PDP FAQ Q2")).toBeVisible();

    const ldJsonTexts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const faqJsonLd = ldJsonTexts.map((t) => JSON.parse(t)).find((d) => d["@type"] === "FAQPage");
    expect(faqJsonLd).toBeTruthy();
    expect(faqJsonLd.mainEntity.some((q: { name: string }) => q.name === "E2E PDP FAQ Q1")).toBe(true);
  });
});
