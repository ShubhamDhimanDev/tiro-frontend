import { test, expect } from "@playwright/test";
import { seedContentPages, seedLocationScopedFaq, CMS_FIXTURE_SLUGS } from "../helpers/content";

/**
 * Location content page — static authored content, `LocalBusinessJsonLd`
 * (closes the Phase 1 structured-data gap), the optional live
 * serviceability-check widget (only rendered when `service_zone_id` is
 * linked — see `app/locations/[slug]/page.tsx`'s doc comment), and its own
 * page-scoped `<FaqBlock contentPageId>`.
 */

test.describe("Location page detail", () => {
  test.beforeAll(async () => {
    await seedContentPages();
    await seedLocationScopedFaq();
  });

  test("renders static content, the live-widget area (service_zone linked), LocalBusiness JSON-LD, and its scoped FAQ", async ({
    page,
  }) => {
    const res = await page.goto(`/locations/${CMS_FIXTURE_SLUGS.locationWithZone}`);
    expect(res?.status()).toBe(200);

    // Static authored content.
    await expect(page.getByRole("heading", { name: "E2E Test Location - Richmond VIC" })).toBeVisible();
    await expect(page.getByText("Location body.")).toBeVisible();

    // Live-widget area only renders because this page links a service_zone.
    await expect(page.getByRole("heading", { name: "Check we service your address" })).toBeVisible();
    await expect(page.getByText(/We currently service the Melbourne Metro area/)).toBeVisible();
    await expect(page.getByLabel("Suburb or postcode")).toBeVisible();
    await expect(page.getByPlaceholder("Enter your suburb or postcode")).toBeVisible();

    // Page-scoped FaqBlock (contentPageId, not category="pdp").
    await expect(page.getByText("E2E Location FAQ Q1")).toBeVisible();
    await expect(page.getByText("E2E Location FAQ A1")).toBeVisible();

    // LocalBusiness JSON-LD actually present in the rendered HTML.
    const ldJsonTexts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = ldJsonTexts.map((t) => JSON.parse(t));
    const localBusiness = parsed.find((d) => d["@type"] === "LocalBusiness");
    expect(localBusiness).toBeTruthy();
    expect(localBusiness.name).toBe("Tiro Mobile Tyres — Melbourne Metro");
    expect(localBusiness.areaServed).toBe("Melbourne Metro");
    expect(localBusiness.url).toBe(`/locations/${CMS_FIXTURE_SLUGS.locationWithZone}`);

    const breadcrumb = parsed.find((d) => d["@type"] === "BreadcrumbList");
    expect(breadcrumb).toBeTruthy();

    const faqJsonLd = parsed.find((d) => d["@type"] === "FAQPage");
    expect(faqJsonLd).toBeTruthy();
    expect(faqJsonLd.mainEntity.some((q: { name: string }) => q.name === "E2E Location FAQ Q1")).toBe(true);
  });

  test("an unknown location slug 404s", async ({ page }) => {
    const res = await page.goto("/locations/not-a-real-location-slug");
    expect(res?.status()).toBe(404);
  });
});
