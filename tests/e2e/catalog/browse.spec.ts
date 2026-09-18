import { test, expect } from "@playwright/test";

/**
 * Browse surfaces (brand listing/detail, by-type, popular-sizes deep link,
 * latest releases) — docs/architecture/02-api-contract.md's catalogue
 * section, exercised against backend-agent's real endpoints
 * (CATALOG_BACKEND=live). Assertions are pinned to `CatalogueSeeder`'s
 * actual seed data (4 brands, 7 models across every TyreCategory/TyreType,
 * staggered `released_at` dates for latest-releases ordering).
 */

test.describe("brand browsing", () => {
  test("brand listing links into a brand detail page showing that brand's products, with structured data", async ({
    page,
  }) => {
    await page.goto("/brands");
    await expect(page.getByRole("heading", { name: "Tyre brands" })).toBeVisible();
    for (const brand of ["Bridgestone", "Michelin", "Goodyear", "Kumho"]) {
      await expect(page.getByText(brand, { exact: true })).toBeVisible();
    }

    await page.getByRole("link", { name: "Michelin" }).click();
    await expect(page).toHaveURL("/brands/michelin");
    await expect(page.getByRole("heading", { name: "Michelin tyres" })).toBeVisible();
    // Michelin's two seeded models — Primacy 4 and Pilot Sport 4 — both show
    // up, and no other brand's model leaks onto this page.
    await expect(page.getByText("Primacy 4")).toBeVisible();
    await expect(page.getByText("Pilot Sport 4")).toBeVisible();
    await expect(page.getByText("Turanza T005")).not.toBeVisible();

    // BreadcrumbList structured data — "rendering with the right structured
    // data, not just a 200 response": assert the actual JSON-LD payload,
    // not merely that a <script type="application/ld+json"> tag exists.
    const breadcrumbJson = await page.locator('script[type="application/ld+json"]').first().textContent();
    const breadcrumb = JSON.parse(breadcrumbJson!);
    expect(breadcrumb["@type"]).toBe("BreadcrumbList");
    expect(breadcrumb.itemListElement.map((i: { name: string }) => i.name)).toEqual(["Home", "Brands", "Michelin"]);
    expect(breadcrumb.itemListElement.at(-1).item).toBe("/brands/michelin");
  });

  test("an unknown brand slug 404s rather than rendering an empty page", async ({ page }) => {
    const res = await page.goto("/brands/not-a-real-brand");
    expect(res?.status()).toBe(404);
  });
});

test.describe("browse by type", () => {
  test("lists only products of the selected tyre_type", async ({ page }) => {
    // mud_terrain has exactly one seeded model (Kumho Road Venture MT51).
    await page.goto("/tyres/type/mud_terrain");
    await expect(page.getByRole("heading", { name: "Mud-Terrain tyres" })).toBeVisible();
    await expect(page.getByText("Road Venture MT51")).toBeVisible();
    await expect(page.getByText("Turanza T005")).not.toBeVisible();
  });

  test("an invalid type segment 404s (fixed enum, not a free-text slug)", async ({ page }) => {
    const res = await page.goto("/tyres/type/not-a-real-type");
    expect(res?.status()).toBe(404);
  });
});

test.describe("popular sizes", () => {
  test("deep-links from the search hub into a real size search, not its own listing", async ({ page }) => {
    await page.goto("/tyres");
    await expect(page.getByRole("heading", { name: "Find your tyre size" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Popular sizes" })).toBeVisible();

    await page.getByRole("link", { name: "205/55 R16" }).click();

    await expect(page).toHaveURL("/tyres?width=205&profile=55&rim_diameter=16");
    await expect(page.getByText("Turanza T005")).toBeVisible();
  });
});

test.describe("latest releases", () => {
  test("orders models newest-first by released_at", async ({ page }) => {
    await page.goto("/tyres/latest-releases");
    await expect(page.getByRole("heading", { name: "Latest releases" })).toBeVisible();

    // CatalogueSeeder's released_at_months_ago, most-recent first: Kumho
    // Road Venture MT51 (1mo) and Michelin Primacy 4 (3mo) are the two
    // newest of the 7 seeded models — assert they both appear ahead of
    // Michelin Pilot Sport 4, the oldest (24mo).
    const cardText = await page.locator("main, body").innerText();
    const mt51Index = cardText.indexOf("Road Venture MT51");
    const primacyIndex = cardText.indexOf("Primacy 4");
    const pilotSportIndex = cardText.indexOf("Pilot Sport 4");

    expect(mt51Index).toBeGreaterThan(-1);
    expect(primacyIndex).toBeGreaterThan(-1);
    expect(pilotSportIndex).toBeGreaterThan(-1);
    expect(mt51Index).toBeLessThan(pilotSportIndex);
    expect(primacyIndex).toBeLessThan(pilotSportIndex);
  });
});
