import { test, expect } from "@playwright/test";
import { setTamperedZoneCookie } from "../helpers/location";

/**
 * Location/serviceability capture — docs/architecture/02-api-contract.md's
 * "Location/serviceability state flow", exercised against backend-agent's
 * real `POST /api/v1/serviceability` (LOCATION_BACKEND=live — see
 * playwright.config.ts's header). Assertions are pinned to
 * `LocationSeeder`'s actual seed data (see that file's own doc comment for
 * why St Kilda/Ballarat were chosen there): St Kilda (postcode 3182) sits
 * inside Melbourne Metro's 25km radius but *outside* Melbourne CBD
 * Express's smaller 5km radius, so it resolves unambiguously to "Melbourne
 * Metro" without the priority tie-break Melbourne CBD itself would hit;
 * Ballarat is deliberately outside every VIC zone.
 */
test.describe("suburb/postcode serviceability capture", () => {
  test("resolving a serviceable suburb persists the zone across a reload and navigation", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Set your location" }).click();
    await page.getByRole("textbox", { name: "Suburb or postcode" }).fill("St Kilda");
    await page.getByRole("button", { name: "Check", exact: true }).click();

    await expect(page.getByRole("button", { name: "Fitting in Melbourne Metro" })).toBeVisible();

    // Cookie persistence, not just React state: a hard reload re-hydrates
    // <LocationProvider> from scratch via GET /api/location/session, which
    // only has anything to return if the httpOnly mts_service_zone cookie
    // actually survived — this is the property under test, not the click
    // itself.
    await page.reload();
    await expect(page.getByRole("button", { name: "Fitting in Melbourne Metro" })).toBeVisible();

    // And across a real navigation to a different route.
    await page.goto("/tyres");
    await expect(page.getByRole("button", { name: "Fitting in Melbourne Metro" })).toBeVisible();

    const cookies = await page.context().cookies();
    const zoneCookie = cookies.find((c) => c.name === "mts_service_zone");
    expect(zoneCookie).toBeDefined();
    expect(zoneCookie?.httpOnly).toBe(true);
  });

  test("an out-of-area suburb is rejected with a clear message and never sets a zone", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Set your location" }).click();
    await page.getByRole("textbox", { name: "Suburb or postcode" }).fill("Ballarat");
    await page.getByRole("button", { name: "Check", exact: true }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Ballarat" })).toHaveText(
      'We don\'t currently service "Ballarat".'
    );
    await expect(page.getByRole("button", { name: "Set your location" })).toBeVisible();

    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "mts_service_zone")).toBeUndefined();
  });
});

/**
 * The "unresolvable zone" degrade path — docs/architecture/02-api-contract.md's
 * "never silently fall through to an unfiltered nationwide result": a
 * present-but-unresolvable zone id (stale after data changes server-side, or
 * outright tampered client-side) must 404 from the catalog endpoint and
 * surface `<StaleZoneNotice>`, not silently show wrong/unscoped-but-labelled
 * data. `TyreController::resolveZone()` is what actually 404s here — this is
 * exercising that fix against the live backend, not the stub.
 */
test.describe("stale/tampered zone cookie", () => {
  test("a search results page falls back to unscoped results and prompts re-serviceability-check", async ({
    page,
    context,
    baseURL,
  }) => {
    await setTamperedZoneCookie(context, baseURL!);

    await page.goto("/tyres?width=205&profile=55&rim_diameter=16");

    await expect(
      page.getByText(/couldn.t confirm your saved service area/i)
    ).toBeVisible();
    // The re-check form is embedded directly in the notice.
    await expect(page.getByRole("textbox", { name: "Suburb or postcode" })).toBeVisible();

    // Results are still rendered (never a hard error) but degrade to
    // unscoped: no zone price or stock, but the catalogue list price (Phase 7 `list_price`) still shows.
    await expect(page.getByText("Turanza T005").first()).toBeVisible();
    await expect(page.getByText(/\$\d+(\.\d{2})?ea/).first()).toBeVisible();
    await expect(page.getByText("In stock")).toHaveCount(0);

    // The notice clears the now-known-bad cookie on mount so it doesn't keep
    // silently failing on every subsequent SSR load.
    await expect
      .poll(async () => (await context.cookies()).find((c) => c.name === "mts_service_zone"))
      .toBeUndefined();
  });

  test("re-checking serviceability from the stale-zone notice resolves a real zone and dismisses it", async ({
    page,
    context,
    baseURL,
  }) => {
    await setTamperedZoneCookie(context, baseURL!);
    await page.goto("/tyres?width=205&profile=55&rim_diameter=16");

    await expect(page.getByText(/couldn.t confirm your saved service area/i)).toBeVisible();

    await page.getByRole("textbox", { name: "Suburb or postcode" }).fill("St Kilda");
    await page.getByRole("button", { name: "Check", exact: true }).click();

    await expect(page.getByText(/couldn.t confirm your saved service area/i)).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Fitting in Melbourne Metro" })).toBeVisible();
  });
});
