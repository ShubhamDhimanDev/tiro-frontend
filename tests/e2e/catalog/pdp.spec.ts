import { test, expect } from "@playwright/test";
import { resolveZoneViaApi, setTamperedZoneCookie } from "../helpers/location";
import { setZoneInventoryQty, removeZoneInventory } from "../helpers/catalog";

/**
 * PDP — docs/architecture/02-api-contract.md's PDP section: static content
 * is SSG/ISR (`GET /api/v1/tyres/{slug}`, no price/stock ever), price/stock
 * is a separate always-live client fetch (`GET /api/v1/tyres/{slug}/availability`)
 * — deliberately never merged (see `app/tyres/[slug]/page.tsx`'s doc
 * comment). Exercised against backend-agent's real endpoints
 * (CATALOG_BACKEND=live).
 *
 * Zone 3 ("Melbourne CBD Express", resolved for postcode 3000) is used
 * throughout so all four stock_status fixtures below share one zone.
 */

const ZONE_3_POSTCODE = "3000";

test.describe("PDP static content", () => {
  test("renders brand, specs, warranty, and service inclusions immediately, without needing a resolved zone", async ({
    page,
  }) => {
    // Deliberately no zone resolved — static content must not depend on it.
    await page.goto("/tyres/bridgestone-turanza-t005-205-55-r16");

    await expect(page.getByRole("heading", { name: "Turanza T005" })).toBeVisible();
    await expect(page.getByText("Bridgestone", { exact: true })).toBeVisible();
    // Plain `getByText("205/55 R16")` ambiguously matches both this visible
    // spec line and the page's own `<title>` (app/tyres/[slug]/page.tsx:54
    // legitimately embeds the same size string for SEO) — a Playwright
    // strict-mode violation, not an app defect. Match the fuller
    // "205/55 R16 · Load 91 · Speed V" text that only appears in the visible
    // paragraph to disambiguate.
    await expect(page.getByText(/205\/55 R16 · Load 91 · Speed V/)).toBeVisible();
    await expect(page.getByText("Load 91")).toBeVisible();
    await expect(page.getByText("Speed V")).toBeVisible();
    await expect(page.getByText(/manufacturer warranty applies/i)).toBeVisible();
    await expect(page.getByText(/80,000km/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Service inclusions" })).toBeVisible();
    await expect(page.getByText("Computer balancing")).toBeVisible();

    // Product + BreadcrumbList structured data — real payload, not just
    // "a script tag exists". No `offers` block is expected (known,
    // documented gap: price is zone/time-scoped and never available at
    // SSG/ISR time — frontend/CLAUDE.md).
    const ldJsonTexts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = ldJsonTexts.map((t) => JSON.parse(t));

    const product = parsed.find((p) => p["@type"] === "Product");
    expect(product).toBeTruthy();
    expect(product.name).toBe("Bridgestone Turanza T005");
    expect(product.brand).toEqual({ "@type": "Brand", name: "Bridgestone" });
    expect(product.sku).toBe("bridgestone-turanza-t005-205-55-r16");
    expect(product.offers).toBeUndefined();

    const breadcrumb = parsed.find((p) => p["@type"] === "BreadcrumbList");
    expect(breadcrumb).toBeTruthy();
    expect(breadcrumb.itemListElement.map((i: { name: string }) => i.name)).toEqual([
      "Home",
      "Tyres",
      "Bridgestone",
      "Turanza T005 205/55 R16",
    ]);
  });

  test("an unknown slug 404s", async ({ page }) => {
    const res = await page.goto("/tyres/not-a-real-tyre-slug");
    expect(res?.status()).toBe(404);
  });
});

/**
 * Regression guard for the fix documented in `app/tyres/[slug]/page.tsx`'s
 * own doc comment: an invalid PDP slug used to serve a `200` instead of a
 * real `404` because `[slug]` was nested under a `loading.tsx` ancestor,
 * which makes Next.js stream the response and commit the `200` status
 * before the async `notFound()` call below it could run. The fix moved
 * every search/browse route into `app/tyres/(catalog)/` and deleted
 * `app/tyres/[slug]/loading.tsx` so `[slug]` is no longer under any
 * `loading.tsx` in its ancestor chain (a route group's parentheses don't
 * appear in the URL, so this is a pure internal restructure — every URL
 * below stays exactly the same).
 *
 * The test above ("an unknown slug 404s") already guards the actual bug —
 * checking `res?.status()`, not just 404-looking page content, so it can't
 * pass vacuously against a `200` that merely renders a not-found message.
 * This block adds the other half explicitly: confirming the move didn't
 * silently break any of the routes that got relocated into `(catalog)`
 * along the way (same URLs, still resolving, not orphaned/404ing
 * themselves) — a quick sibling-route smoke check, not a re-test of each
 * page's own functionality (already covered in depth by
 * `tests/e2e/catalog/browse.spec.ts` and `tests/e2e/vehicles/picker.spec.ts`).
 */
test.describe("route-group regression guard: app/tyres/(catalog)/ move", () => {
  test("sibling /tyres routes still resolve at their original URLs after being relocated into (catalog)", async ({
    page,
  }) => {
    const tyresRes = await page.goto("/tyres");
    expect(tyresRes?.status()).toBe(200);
    await expect(page).toHaveURL("/tyres");
    await expect(page.getByRole("heading", { name: "Find your tyre size" })).toBeVisible();

    const typeRes = await page.goto("/tyres/type/mud_terrain");
    expect(typeRes?.status()).toBe(200);
    await expect(page).toHaveURL("/tyres/type/mud_terrain");
    await expect(page.getByRole("heading", { name: "Mud-Terrain tyres" })).toBeVisible();

    const latestRes = await page.goto("/tyres/latest-releases");
    expect(latestRes?.status()).toBe(200);
    await expect(page).toHaveURL("/tyres/latest-releases");
    await expect(page.getByRole("heading", { name: "Latest releases" })).toBeVisible();

    const byVehicleRes = await page.goto("/tyres/by-vehicle");
    expect(byVehicleRes?.status()).toBe(200);
    await expect(page).toHaveURL("/tyres/by-vehicle");
    await expect(page.getByRole("heading", { name: "Find tyres for your vehicle" })).toBeVisible();
  });
});

test.describe("PDP availability (separate live fetch)", () => {
  test("prompts for location before showing price/stock when no zone is resolved", async ({ page }) => {
    await page.goto("/tyres/bridgestone-turanza-t005-205-55-r16");
    await expect(page.getByText("Enter your location to see price and availability for this tyre.")).toBeVisible();
    await expect(page.getByText(/^\$/)).not.toBeVisible();
  });

  test("shows the real price and in_stock status once a zone is resolved", async ({ page }) => {
    await resolveZoneViaApi(page, { postcode: ZONE_3_POSTCODE });
    await page.goto("/tyres/bridgestone-turanza-t005-205-55-r16");

    await expect(page.getByText("$189.00")).toBeVisible();
    await expect(page.getByText("In stock")).toBeVisible();
    await expect(page.getByText("per tyre, fitted")).toBeVisible();
  });

  test.describe("stock_status variants", () => {
    // These three variants are otherwise unused by any other spec in this
    // suite specifically so mutating their InventoryItem rows here can't
    // interfere with assertions elsewhere — see helpers/catalog.ts's doc
    // comment for why this mutation exists at all (the seed data alone never
    // produces anything but in_stock).
    test.beforeAll(() => {
      setZoneInventoryQty("michelin-primacy-4-215-55-r17", 3, 0); // -> out_of_stock
      setZoneInventoryQty("goodyear-efficientgrip-performance-195-55-r16", 3, 2); // -> limited
      removeZoneInventory("kumho-road-venture-mt51-285-75-r16", 3); // -> unavailable_in_zone
    });

    test("out_of_stock: price still shows, badge reads Out of stock", async ({ page }) => {
      await resolveZoneViaApi(page, { postcode: ZONE_3_POSTCODE });
      await page.goto("/tyres/michelin-primacy-4-215-55-r17");

      await expect(page.getByText("$239.00")).toBeVisible();
      await expect(page.getByText("Out of stock")).toBeVisible();
    });

    test("limited: price still shows, badge reads Limited stock", async ({ page }) => {
      await resolveZoneViaApi(page, { postcode: ZONE_3_POSTCODE });
      await page.goto("/tyres/goodyear-efficientgrip-performance-195-55-r16");

      await expect(page.getByText("$169.00")).toBeVisible();
      await expect(page.getByText("Limited stock")).toBeVisible();
    });

    /**
     * unavailable_in_zone is the one status with no price shown at all —
     * `<AvailabilityFetch>` short-circuits to a dedicated "not available in
     * your area" message instead of the normal price/badge block (see
     * `components/catalog/pdp-availability.tsx`).
     */
    test("unavailable_in_zone: shows the not-available message instead of a price", async ({ page }) => {
      await resolveZoneViaApi(page, { postcode: ZONE_3_POSTCODE });
      await page.goto("/tyres/kumho-road-venture-mt51-285-75-r16");

      await expect(page.getByText(/isn.t currently available in your area/i)).toBeVisible();
      await expect(page.getByText("$369.00")).not.toBeVisible();
      await expect(page.getByText("Not available in your area")).not.toBeVisible(); // that StockBadge label isn't used on this branch — it's the dedicated message instead
    });
  });

  test("a stale/tampered zone degrades PDP availability back to the location prompt", async ({ page, context, baseURL }) => {
    await setTamperedZoneCookie(context, baseURL!);

    await page.goto("/tyres/bridgestone-turanza-t005-205-55-r16");

    // AvailabilityFetch's 404 branch clears the zone client-side, which
    // re-renders <LocationGate> back into its capture-form state — same
    // "never silently fall through" contract as the search page's
    // <StaleZoneNotice>, just PDP's own local variant of it.
    await expect(page.getByText("Enter your location to see price and availability for this tyre.")).toBeVisible();
  });
});
