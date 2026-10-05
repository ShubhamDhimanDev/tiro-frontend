import { test, expect as baseExpect, type Page } from "@playwright/test";
import { resolveZoneViaApi } from "../helpers/location";

/**
 * Catalogue against the LIVE Laravel API (Phase 7), no mocks: size search ->
 * results with real prices -> server-side filters -> flip card (engine price
 * ladder) -> add to cart -> PDP -> add to cart.
 *
 * Needs the dev data from `php artisan db:seed --class=DemoCatalogSeeder`
 * (docs/redesign/api-contract-phase7.md section 9): 205/55 R16 has premium,
 * mid and budget patterns. Counts are compared with the API itself, so the
 * assertions do not hard-code seed prices. Run at desktop width (the sidebar
 * filters show from 1024px; Playwright's Desktop Chrome is 1280).
 */

// Dev-server compiles and the SSR round trips to Laravel can exceed the default 5 s assertion timeout.
const expect = baseExpect.configure({ timeout: 20_000 });

const API = `${process.env.LARAVEL_API_URL ?? "http://localhost:8000"}/api/v1`;
const SIZE = { width: "205", profile: "55", rim: "16" };
const SIZE_QUERY = `width=${SIZE.width}&profile=${SIZE.profile}&rim_diameter=${SIZE.rim}`;

async function apiTotal(page: Page, extra = ""): Promise<number> {
  const res = await page.request.get(`${API}/tyres?${SIZE_QUERY}&per_page=1${extra}`, { headers: { Accept: "application/json" } });
  expect(res.ok(), `GET /tyres ${extra}`).toBeTruthy();
  return (await res.json()).meta.total as number;
}

async function shownTotal(page: Page): Promise<number> {
  const text = (await page.getByTestId("result-count").textContent()) ?? "";
  const match = text.match(/(\d+)\s+tyres?\s+found/);
  expect(match, `result count text "${text}"`).not.toBeNull();
  return Number(match![1]);
}

test.describe("live catalogue", () => {
  // The dev server compiles routes on first hit, so give navigations room.
  test.setTimeout(120_000);
  test.use({ actionTimeout: 30_000, navigationTimeout: 60_000 });
  test.beforeEach(() => {
    test.slow();
  });

  test("search -> results -> filters -> flip card -> add to cart -> PDP", async ({ page }) => {
    const zone = await resolveZoneViaApi(page, { postcode: "3000" });
    expect(zone.zoneId).toBeTruthy();

    // 1. Search by size from the finder hub.
    await page.goto("/tyres");
    await page.locator('select[aria-label$="width"]').first().selectOption(SIZE.width);
    await page.locator('select[aria-label$="profile"]').first().selectOption(SIZE.profile);
    await page.locator('select[aria-label$="rim diameter"]').first().selectOption(SIZE.rim);
    await page.getByRole("button", { name: /Find tyres|Search tyres/ }).first().click();
    await expect(page).toHaveURL(/width=205/);

    // 2. Results: real data, count matches the API, every card has a real price (no placeholder).
    const cards = page.getByTestId("tyre-card");
    await expect(cards.first()).toBeVisible();
    const total = await apiTotal(page);
    expect(total).toBeGreaterThanOrEqual(3);
    expect(await shownTotal(page)).toBe(total);
    await expect(page.locator('[data-mock="true"]')).toHaveCount(0);
    await expect(page.getByTestId("tier-pick-premium")).toBeVisible();
    await expect(page.getByTestId("tier-pick-mid")).toBeVisible();
    await expect(page.getByTestId("tier-pick-budget")).toBeVisible();
    for (const card of await cards.all()) {
      await expect(card.getByText(/\$\d+(\.\d{2})?ea/).first()).toBeVisible();
    }

    // 3. Server-side filters: counts must equal what the API says for the same params.
    const sidebar = page.getByRole("complementary", { name: "Filters" });
    // Options come from the facets' load index range, so pick the highest one offered.
    const loadOptions = await sidebar.getByLabel("Min. load index").locator("option").evaluateAll((els) => els.map((el) => (el as HTMLOptionElement).value).filter(Boolean));
    expect(loadOptions.length).toBeGreaterThan(0);
    const minLoad = loadOptions[loadOptions.length - 1];
    await sidebar.getByLabel("Min. load index").selectOption(minLoad);
    await expect(page).toHaveURL(new RegExp(`min_load=${minLoad}`));
    const loadTotal = await apiTotal(page, `&min_load=${minLoad}`);
    await expect.poll(() => shownTotal(page)).toBe(loadTotal);

    await sidebar.getByLabel("Min. load index").selectOption("");
    await expect(page).not.toHaveURL(/min_load/);
    await expect.poll(() => shownTotal(page)).toBe(total);

    // Multi-select brands (OR) via the facet-driven list.
    await sidebar.getByRole("button", { name: /^Brands/ }).click();
    const brandBoxes = sidebar.getByRole("region", { name: "Brands" }).getByRole("checkbox");
    await expect(brandBoxes.first()).toBeVisible();
    expect(await brandBoxes.count()).toBeGreaterThanOrEqual(2);
    const firstLabel = ((await brandBoxes.nth(0).locator("xpath=..").textContent()) ?? "").replace(/\d+$/, "").trim();
    const secondLabel = ((await brandBoxes.nth(1).locator("xpath=..").textContent()) ?? "").replace(/\d+$/, "").trim();
    await brandBoxes.nth(0).check();
    await expect(page).toHaveURL(/brand=/); // each tick navigates and remounts the sidebar
    await sidebar.getByRole("region", { name: "Brands" }).getByRole("checkbox").nth(1).check();
    await expect(page).toHaveURL(/brand=[^&]+%2C[^&]+|brand=[^&]+,[^&]+/);
    const brandParam = new URL(page.url()).searchParams.get("brand")!;
    expect(brandParam.split(",")).toHaveLength(2);
    const brandTotal = await apiTotal(page, `&brand=${brandParam}`);
    await expect.poll(() => shownTotal(page)).toBe(brandTotal);
    expect(firstLabel).not.toEqual(secondLabel);

    // Run-flat and price range reach the API too.
    await sidebar.getByRole("button", { name: /Clear filters/ }).first().click();
    await expect.poll(() => shownTotal(page)).toBe(total);
    await sidebar.getByLabel("Runflat", { exact: true }).selectOption("no");
    await expect(page).toHaveURL(/runflat=no/);
    await expect.poll(() => shownTotal(page)).toBe(await apiTotal(page, "&runflat=no"));
    await sidebar.getByLabel("Runflat", { exact: true }).selectOption("");
    await expect(page).not.toHaveURL(/runflat/);

    // A filter that matches nothing shows the empty state with a way out, not an error.
    await page.goto(`/tyres?${SIZE_QUERY}&price_min=500`);
    await expect(page.getByTestId("no-results")).toContainText("No tyres match these filters");
    await page.getByTestId("no-results").getByRole("link", { name: "Clear filters" }).click();
    await expect(page).not.toHaveURL(/price_min/);
    await expect(cards.first()).toBeVisible();

    // 4. Flip a single-size card: price table from the pricing engine, then Add to cart.
    // Pin the card by index: once flipped, its front face is inert, so a "has Select quantity" filter would stop matching it.
    const allCards = await cards.all();
    let cardIndex = -1;
    for (let i = 0; i < allCards.length && cardIndex < 0; i++) {
      if ((await allCards[i].getByRole("button", { name: /^Select quantity for/ }).count()) > 0) cardIndex = i;
    }
    expect(cardIndex, "a single-size card with a Select quantity button").toBeGreaterThanOrEqual(0);
    const card = cards.nth(cardIndex);
    await card.getByRole("button", { name: /^Select quantity for/ }).click();
    await expect(card.getByRole("radio")).toHaveCount(5);
    await expect(card.getByRole("radio", { name: /4 Tyres/ })).toBeChecked();
    const add = card.getByTestId("quick-add");
    await expect(add).toBeEnabled(); // enabled once /tyres/price-ladders has answered
    await expect(card.getByText("...")).toHaveCount(0);
    await card.getByRole("radio", { name: /2 Tyres/ }).check();
    await add.click();
    await expect(card.getByRole("status")).toContainText(/added to cart \(2 tyres\)/);
    await expect(page.getByTestId("cart-count")).toHaveText("2");

    // 5. PDP from the flipped card.
    await card.getByRole("link", { name: "Product details" }).click();
    await expect(page).toHaveURL(/\/tyres\/[a-z0-9-]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Zone price appears, quantity boxes 1-5 (default 4), total updates with the engine's ladder.
    const total4 = page.getByTestId("pdp-total");
    await expect(total4).toBeVisible();
    await expect(page.getByRole("radio", { name: /^4/ })).toBeChecked();
    await page.getByTestId("pdp-add").click();
    await expect(page.getByTestId("cart-count")).toHaveText("6"); // 2 from the card + 4 from the PDP
  });

  test("an unreachable filter value is explained, not a crash", async ({ page }) => {
    await page.goto(`/tyres?${SIZE_QUERY}&min_load=999`);
    await expect(page.getByTestId("invalid-filter")).toBeVisible();
    await page.getByTestId("invalid-filter").getByRole("link", { name: "Clear filters" }).click();
    await expect(page.getByTestId("tyre-card").first()).toBeVisible();
  });

  test("brand and type pages show real list prices without a location", async ({ page }) => {
    await page.goto("/brands/michelin");
    await expect(page.getByTestId("tyre-card").first()).toBeVisible();
    await expect(page.locator('[data-mock="true"]')).toHaveCount(0);
    await expect(page.getByText(/\$\d+(\.\d{2})?ea/).first()).toBeVisible();
  });
});
