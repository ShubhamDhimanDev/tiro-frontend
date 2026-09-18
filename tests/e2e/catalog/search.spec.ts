import { test, expect } from "@playwright/test";
import { resolveZoneViaApi } from "../helpers/location";

/**
 * Tyre-size search — docs/architecture/02-api-contract.md's catalogue
 * section, requirements §3.1, exercised against backend-agent's real
 * `GET /api/v1/tyres` (CATALOG_BACKEND=live). Sizes referenced below are
 * pinned to `CatalogueSeeder`'s actual seed data — see that file's doc
 * comment.
 */
test.describe("flat tyre-size search", () => {
  test("shows no price until a zone is resolved, and the real price once one is", async ({ page }) => {
    // No zone resolved yet for this test's fresh browser context.
    await page.goto("/tyres?width=205&profile=55&rim_diameter=16");
    await expect(page.getByText("Turanza T005")).toBeVisible();
    await expect(page.getByText("Set your location to see pricing")).toBeVisible();
    await expect(page.getByText(/^from \$/i)).not.toBeVisible();

    // This is the real gap this phase found and fixed: search results must
    // actually carry price once a zone is resolved, not just stock_status —
    // see frontend/CLAUDE.md and TyreVariantResource's `unit_price`/
    // `promotional_price` being zone-gated the same way `stock_status` is.
    await resolveZoneViaApi(page, { postcode: "3000" }); // -> Melbourne CBD Express
    await page.goto("/tyres?width=205&profile=55&rim_diameter=16");

    await expect(page.getByText("From $189.00")).toBeVisible();
    await expect(page.getByText("In stock")).toBeVisible();
  });

  test("a well-formed size with no matching products explains itself rather than erroring", async ({ page }) => {
    // 100/20/10 is the extreme low end of every dimension's valid ('between')
    // range — well-formed per TyreIndexRequest's validation, but guaranteed
    // to match nothing in the seeded catalogue.
    await page.goto("/tyres?width=100&profile=20&rim_diameter=10");
    await expect(page.getByText(/no products available for this fitment/i)).toBeVisible();
  });

  test("paginates flat results without disturbing the applied filters", async ({ page }) => {
    // 265/70/17 is the one size two different seeded models share (Kumho
    // Road Venture MT51 and Goodyear Wrangler Territory) — per_page=1 forces
    // a real two-page result for it, which the seed data otherwise never
    // produces for any single flat search (every other size has exactly one
    // matching model).
    await page.goto("/tyres?width=265&profile=70&rim_diameter=17&per_page=1");

    await expect(page.getByText("Page 1 of 2")).toBeVisible();
    await expect(page.getByText("Road Venture MT51")).toBeVisible();

    await page.getByRole("link", { name: "Next" }).click();

    await expect(page).toHaveURL(/page=2/);
    await expect(page).toHaveURL(/width=265/);
    await expect(page.getByText("Page 2 of 2")).toBeVisible();
    await expect(page.getByText("Wrangler Territory")).toBeVisible();
    await expect(page.getByText("Road Venture MT51")).not.toBeVisible();
  });
});

test.describe("staggered tyre-size search", () => {
  test("renders independent front/rear sections with their own results", async ({ page }) => {
    await page.goto(
      "/tyres?staggered=true&front_width=205&front_profile=55&front_rim_diameter=16&rear_width=225&rear_profile=45&rear_rim_diameter=17"
    );

    const front = page.locator("section").filter({ has: page.getByRole("heading", { name: "Front tyres" }) });
    const rear = page.locator("section").filter({ has: page.getByRole("heading", { name: "Rear tyres" }) });
    await expect(front.getByText("Turanza T005")).toBeVisible();
    await expect(rear.getByText("Turanza T005")).toBeVisible();
  });

  /**
   * The load-bearing regression this phase reconciled (frontend/CLAUDE.md:
   * "Staggered search pagination"): front/rear paginate via two distinct
   * `front_page`/`rear_page` params, not one shared `page` — advancing one
   * side must never move the other. Both sides deliberately search the same
   * seeded size (265/70/17, the one size with two matching models — see the
   * flat-search pagination test above) purely so *both* sides genuinely have
   * 2 pages to page through; a real staggered fitment wouldn't normally use
   * the same front/rear size, but the seed data has exactly one size with
   * more than one matching product, so this is what's available to
   * genuinely exercise two-page pagination on both sides at once.
   */
  test("paginates front and rear results independently", async ({ page }) => {
    await page.goto(
      "/tyres?staggered=true&front_width=265&front_profile=70&front_rim_diameter=17&rear_width=265&rear_profile=70&rear_rim_diameter=17&per_page=1"
    );

    const front = page.locator("section").filter({ has: page.getByRole("heading", { name: "Front tyres" }) });
    const rear = page.locator("section").filter({ has: page.getByRole("heading", { name: "Rear tyres" }) });

    await expect(front.getByText("Road Venture MT51")).toBeVisible();
    await expect(rear.getByText("Road Venture MT51")).toBeVisible();

    // Advance the FRONT side only.
    await front.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/front_page=2/);
    await expect(page).toHaveURL(/rear_page=1/);

    await expect(front.getByText("Wrangler Territory")).toBeVisible();
    // Rear must be untouched by advancing front.
    await expect(rear.getByText("Road Venture MT51")).toBeVisible();
    await expect(rear.getByText("Wrangler Territory")).not.toBeVisible();

    // Now advance the REAR side only, from wherever front currently is.
    await rear.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/front_page=2/);
    await expect(page).toHaveURL(/rear_page=2/);

    // Front must be untouched by advancing rear.
    await expect(front.getByText("Wrangler Territory")).toBeVisible();
    await expect(rear.getByText("Wrangler Territory")).toBeVisible();
  });
});
