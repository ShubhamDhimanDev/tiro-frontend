import { test, expect, type Page } from "@playwright/test";

/**
 * Manual vehicle identification & fitment picker (`/tyres/by-vehicle`,
 * Phase 2) — see frontend/CLAUDE.md's "Vehicle identification & fitment
 * picker (Phase 2)" section and docs/architecture/02-api-contract.md's
 * "Vehicle identification & fitment endpoints" section.
 *
 * ## Backend prerequisite — deliberately NOT the shared dev backend
 *
 * Every other spec in this suite (`tests/e2e/auth/**`, `tests/e2e/catalog/**`,
 * `tests/e2e/location/**`) runs against the one long-lived `php artisan
 * serve` at the default `LARAVEL_API_URL` (http://localhost:8000), seeded
 * once via `CatalogueSeeder`/`LocationSeeder`. This spec cannot do that: as
 * of 2026-09-14 the shared dev DB (`tiro`) has never had `php artisan
 * migrate` run against it for the `vehicles`/`vehicle_fitments` tables (the
 * `vehicles` table does not exist there — verified directly, not assumed),
 * and root CLAUDE.md/qa-lead policy forbids running `migrate`/`migrate:fresh`
 * against that shared DB from a test run (2026-09-11 round-3 collision
 * incident). So this spec requires its own isolated backend instance,
 * created via `backend/scripts/test-db.sh` and seeded with `Vehicle`/
 * `VehicleFitment` rows reproducing the exact scenario
 * `lib/vehicles/fixtures.ts` documents (disambiguation pair sharing a
 * 2019–2023 year range, one of them staggered; a zero-fitment vehicle; an
 * unambiguous Mazda 3; an unambiguous Holden Commodore) — NOT the shared
 * dev DB's catalogue/location data, which this spec doesn't need or touch.
 *
 * To reproduce the exact isolated setup this was run against:
 *
 *   cd backend
 *   eval "$(bash scripts/test-db.sh create)"
 *   php artisan migrate:fresh --force
 *   php artisan tinker --execute='
 *     $sedan = App\Models\Vehicle::factory()->create(["make"=>"Toyota","model"=>"Corolla","series"=>"Ascent Sport","body_type"=>"sedan","year_from"=>2019,"year_to"=>2023]);
 *     App\Models\VehicleFitment::factory()->for($sedan)->create(["position"=>App\Enums\VehicleFitmentPosition::All,"width"=>205,"profile"=>55,"rim_diameter"=>16,"load_index"=>"91","speed_rating"=>"V","is_staggered"=>false,"confidence"=>App\Enums\VehicleFitmentConfidence::Confirmed]);
 *     $hatch = App\Models\Vehicle::factory()->create(["make"=>"Toyota","model"=>"Corolla","series"=>"Ascent Sport","body_type"=>"hatch","year_from"=>2019,"year_to"=>2023]);
 *     App\Models\VehicleFitment::factory()->for($hatch)->front()->create(["width"=>215,"profile"=>45,"rim_diameter"=>17,"load_index"=>"91","speed_rating"=>"W","confidence"=>App\Enums\VehicleFitmentConfidence::Confirmed]);
 *     App\Models\VehicleFitment::factory()->for($hatch)->rear()->create(["width"=>235,"profile"=>40,"rim_diameter"=>17,"load_index"=>"94","speed_rating"=>"W","confidence"=>App\Enums\VehicleFitmentConfidence::Confirmed]);
 *     $zero = App\Models\Vehicle::factory()->create(["make"=>"Toyota","model"=>"Corolla","series"=>"Ascent","body_type"=>"sedan","year_from"=>2013,"year_to"=>2018]);
 *     $mazda = App\Models\Vehicle::factory()->create(["make"=>"Mazda","model"=>"3","series"=>null,"body_type"=>"hatch","year_from"=>2014,"year_to"=>2018]);
 *     App\Models\VehicleFitment::factory()->for($mazda)->create(["position"=>App\Enums\VehicleFitmentPosition::All,"width"=>205,"profile"=>60,"rim_diameter"=>16,"load_index"=>"92","speed_rating"=>"H","is_staggered"=>false,"confidence"=>App\Enums\VehicleFitmentConfidence::Likely]);
 *     $holden = App\Models\Vehicle::factory()->create(["make"=>"Holden","model"=>"Commodore","series"=>"VF","body_type"=>"sedan","year_from"=>2013,"year_to"=>2017]);
 *     App\Models\VehicleFitment::factory()->for($holden)->create(["position"=>App\Enums\VehicleFitmentPosition::All,"width"=>235,"profile"=>60,"rim_diameter"=>16,"load_index"=>"100","speed_rating"=>"T","is_staggered"=>false,"confidence"=>App\Enums\VehicleFitmentConfidence::Confirmed]);
 *   '
 *   php artisan serve --port=8010
 *
 * ...then, from `frontend/`, with that server up:
 *
 *   LARAVEL_API_URL=http://localhost:8010 npx playwright test tests/e2e/vehicles
 *
 * Run this spec on its own, not as part of `npm run test:e2e`'s full suite
 * — pointing `LARAVEL_API_URL` at the isolated instance above for a whole
 * run would make every other spec's catalogue/location/auth assertions
 * fail against an unseeded DB. Drop the isolated schema afterward with
 * `bash scripts/test-db.sh drop "$TIRO_TEST_DB_SUFFIX"` (from the shell the
 * `create` step ran in).
 *
 * The zero-fitment/disambiguation/staggered scenario ids this was verified
 * against (fresh DB, so auto-increment from 1): sedan=1, hatch(staggered)=2,
 * zero-fitment=3, mazda=4, holden=5. Tests below never hardcode these ids —
 * they drive the UI by make/model/year exactly as a real user would, same
 * as the rest of this suite.
 */

async function selectMake(page: Page, make: string) {
  const makeSelect = page.getByLabel("Make");
  await expect(makeSelect).toBeEnabled();
  await makeSelect.selectOption(make);
}

async function selectModel(page: Page, model: string) {
  const modelSelect = page.getByLabel("Model");
  await expect(modelSelect).toBeEnabled();
  await modelSelect.selectOption(model);
}

/** Selects a year/generation option by its group key (`${year_from}-${year_to}`, the `<option>`'s `value` — plain ASCII hyphen, unlike the en-dash-separated display label). */
async function selectYearGroup(page: Page, yearFrom: number, yearTo: number) {
  const yearSelect = page.getByLabel("Year");
  await expect(yearSelect).toBeEnabled();
  await yearSelect.selectOption(`${yearFrom}-${yearTo}`);
}

/** Picks the disambiguation option whose visible text contains `bodyTypeSubstring` (e.g. "sedan"/"hatch") without hardcoding the middle-dot-separated label format or the vehicle id. */
async function selectDisambiguationByBodyType(page: Page, bodyTypeSubstring: string) {
  const option = page.locator("#vehicle-disambiguation option", { hasText: bodyTypeSubstring });
  const value = await option.getAttribute("value");
  expect(value, `expected a disambiguation option matching "${bodyTypeSubstring}"`).toBeTruthy();
  await page.getByLabel("Series / body type").selectOption(value!);
}

/**
 * `next dev` (Turbopack) lazily compiles each dynamic Route Handler on its
 * *first* request — including this suite's own `/api/vehicles/*` proxies —
 * which can comfortably exceed the default 5s `expect(...).toBeVisible()`/
 * `toBeEnabled()` timeout the first time any given route is hit, even
 * though the same route responds in milliseconds on every request after.
 * This isn't specific to the vehicles domain (every other domain's E2E
 * specs share the same dev server and would show the same first-hit cost
 * if they were run cold), but this is the first spec file to newly add
 * four never-before-exercised routes, so it's the one that actually
 * surfaces it. Force all four through one cold compile up front, with a
 * generous timeout budget, so the timed UI assertions below never pay for
 * it — confirmed necessary: without this, exactly the tests that are
 * first-in-file to reach a given route flake on it.
 */
test.beforeAll(async ({ request }) => {
  await request.get("/api/vehicles/makes", { timeout: 30_000 });
  await request.get("/api/vehicles/models?make=Toyota", { timeout: 30_000 });
  await request.get("/api/vehicles/years?make=Toyota&model=Corolla", { timeout: 30_000 });
  const years = await request.get("/api/vehicles/years?make=Toyota&model=Corolla", { timeout: 30_000 });
  const body = (await years.json()) as { data: Array<{ id: number }> };
  const firstId = body.data[0]?.id;
  if (firstId !== undefined) {
    await request.get(`/api/vehicles/${firstId}/fitment`, { timeout: 30_000 });
  }
});

test.describe("vehicle picker: non-staggered happy path", () => {
  test("Holden Commodore (unambiguous) resolves fitment and hands off correct params to /tyres", async ({ page }) => {
    await page.goto("/tyres/by-vehicle");
    await selectMake(page, "Holden");
    await selectModel(page, "Commodore");
    await selectYearGroup(page, 2013, 2017);

    // Single candidate row for this year range -> no disambiguation step,
    // fitment fetch fires immediately per the picker's documented "no
    // separate confirm step" behavior.
    await expect(page.getByLabel("Series / body type")).toHaveCount(0);
    await expect(page.getByText("Confirmed fitment for")).toBeVisible();
    await expect(page.getByText("235/60 R16")).toBeVisible();
    await expect(page.getByText(/Load index 100/)).toBeVisible();
    await expect(page.getByText(/Speed rating T/)).toBeVisible();

    const link = page.getByRole("link", { name: "Shop tyres for this fitment" });
    const href = await link.getAttribute("href");
    expect(href).toContain("width=235");
    expect(href).toContain("profile=60");
    expect(href).toContain("rim_diameter=16");

    await link.click();
    await expect(page).toHaveURL(/\/tyres\?/);
    await expect(page).toHaveURL(/width=235/);
    await expect(page).toHaveURL(/profile=60/);
    await expect(page).toHaveURL(/rim_diameter=16/);
    // No CatalogueSeeder data in this isolated backend, so the fitment
    // resolves to a genuine (if empty) results page rather than an error —
    // confirming the handoff params are well-formed enough for TyreController
    // to accept, not merely that the link's href looks right.
    await expect(page.getByText(/no products available for this fitment/i)).toBeVisible();
  });

  test("Mazda 3 (unambiguous, non-confirmed confidence) surfaces the confidence caveat", async ({ page }) => {
    await page.goto("/tyres/by-vehicle");
    await selectMake(page, "Mazda");
    await selectModel(page, "3");
    await selectYearGroup(page, 2014, 2018);

    await expect(page.getByText("205/60 R16")).toBeVisible();
    await expect(page.getByText(/Fitment confidence: likely/)).toBeVisible();
  });
});

test.describe("vehicle picker: series/body_type disambiguation", () => {
  test("a year range with two candidates prompts disambiguation and resolves the sedan correctly", async ({ page }) => {
    await page.goto("/tyres/by-vehicle");
    await selectMake(page, "Toyota");
    await selectModel(page, "Corolla");
    await selectYearGroup(page, 2019, 2023);

    const disambig = page.getByLabel("Series / body type");
    await expect(disambig).toBeVisible();
    const options = page.locator("#vehicle-disambiguation option");
    await expect(options).toHaveCount(3); // placeholder + sedan + hatch

    // Fitment must not resolve until the disambiguation pick is made.
    await expect(page.getByText("Confirmed fitment for")).toHaveCount(0);

    await selectDisambiguationByBodyType(page, "sedan");

    await expect(page.getByText("Confirmed fitment for")).toBeVisible();
    await expect(page.getByText("205/55 R16")).toBeVisible();
    await expect(page.getByText(/Load index 91/)).toBeVisible();
    await expect(page.getByText(/Speed rating V/)).toBeVisible();
    // Confirms the non-staggered branch, not the staggered sibling sharing
    // this same year range.
    await expect(page.getByText(/staggered/i)).toHaveCount(0);
    await expect(page.getByText("Front", { exact: true })).toHaveCount(0);

    const href = await page.getByRole("link", { name: "Shop tyres for this fitment" }).getAttribute("href");
    expect(href).toContain("width=205");
    expect(href).toContain("profile=55");
    expect(href).toContain("rim_diameter=16");
  });

  test("switching the disambiguation pick re-resolves fitment for the newly selected vehicle", async ({ page }) => {
    await page.goto("/tyres/by-vehicle");
    await selectMake(page, "Toyota");
    await selectModel(page, "Corolla");
    await selectYearGroup(page, 2019, 2023);

    await selectDisambiguationByBodyType(page, "sedan");
    await expect(page.getByText("205/55 R16")).toBeVisible();

    await selectDisambiguationByBodyType(page, "hatch");
    await expect(page.getByText("205/55 R16")).toHaveCount(0);
    await expect(page.getByText("215/45 R17")).toBeVisible(); // front, staggered vehicle
  });
});

test.describe("vehicle picker: staggered fitment", () => {
  test("the staggered candidate from the same disambiguation group displays front/rear separately and hands off both sides to /tyres", async ({
    page,
  }) => {
    await page.goto("/tyres/by-vehicle");
    await selectMake(page, "Toyota");
    await selectModel(page, "Corolla");
    await selectYearGroup(page, 2019, 2023);
    await selectDisambiguationByBodyType(page, "hatch");

    await expect(page.getByText(/staggered.*front and rear differ/i)).toBeVisible();
    await expect(page.getByText("Front", { exact: true })).toBeVisible();
    await expect(page.getByText("Rear", { exact: true })).toBeVisible();
    await expect(page.getByText("215/45 R17")).toBeVisible();
    await expect(page.getByText("235/40 R17")).toBeVisible();
    await expect(page.getByText(/Load index 91.*Speed rating W/)).toBeVisible();
    await expect(page.getByText(/Load index 94.*Speed rating W/)).toBeVisible();

    const href = await page.getByRole("link", { name: "Shop tyres for this fitment" }).getAttribute("href");
    expect(href).toContain("staggered=true");
    expect(href).toContain("front_width=215");
    expect(href).toContain("front_profile=45");
    expect(href).toContain("front_rim_diameter=17");
    expect(href).toContain("rear_width=235");
    expect(href).toContain("rear_profile=40");
    expect(href).toContain("rear_rim_diameter=17");

    await page.getByRole("link", { name: "Shop tyres for this fitment" }).click();

    // Handoff correctness: every staggered param survives the navigation,
    // both pagination params default to page 1, and the results page's
    // independent front/rear pagination shell (already covered end-to-end
    // against seeded catalogue data by tests/e2e/catalog/search.spec.ts)
    // renders without error for this handoff's params. Not a re-test of
    // pagination behavior itself — this isolated backend has no seeded
    // TyreVariant data, so both sides legitimately come back empty.
    await expect(page).toHaveURL(/staggered=true/);
    await expect(page).toHaveURL(/front_width=215/);
    await expect(page).toHaveURL(/front_profile=45/);
    await expect(page).toHaveURL(/front_rim_diameter=17/);
    await expect(page).toHaveURL(/rear_width=235/);
    await expect(page).toHaveURL(/rear_profile=40/);
    await expect(page).toHaveURL(/rear_rim_diameter=17/);
    await expect(page).toHaveURL(/front_page=1/);
    await expect(page).toHaveURL(/rear_page=1/);

    await expect(page.getByRole("heading", { name: "Front tyres" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rear tyres" })).toBeVisible();
    await expect(page.getByText("No front tyres available for this fitment.")).toBeVisible();
    await expect(page.getByText("No rear tyres available for this fitment.")).toBeVisible();
  });
});

test.describe("vehicle picker: zero-fitment vehicle", () => {
  test("a vehicle with no confirmed fitment rows shows the data-gap message, not a dead end", async ({ page }) => {
    await page.goto("/tyres/by-vehicle");
    await selectMake(page, "Toyota");
    await selectModel(page, "Corolla");
    await selectYearGroup(page, 2013, 2018); // single-row range -> no disambiguation

    await expect(page.getByLabel("Series / body type")).toHaveCount(0);
    await expect(page.getByText(/we don.t have confirmed fitment data for this vehicle yet/i)).toBeVisible();

    const link = page.getByRole("link", { name: "Search by tyre size" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/tyres");

    await link.click();
    await expect(page).toHaveURL(/\/tyres$/);
    await expect(page.getByRole("heading", { name: "Find your tyre size" })).toBeVisible();
  });
});

test.describe("vehicle picker: validation & error edge cases", () => {
  test("a make that resolves to zero models shows an empty state, not a crash", async ({ page }) => {
    // The real makes() list can never itself produce a make with zero
    // active models (models() only lists makes that already have active
    // vehicles) -- this defensive UI state is only reachable by simulating
    // a response shape the real backend wouldn't normally return for a
    // make that *is* in the dropdown, so it's intercepted here rather than
    // built from real fixture data.
    await page.route("**/api/vehicles/models**", async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("make") === "Holden") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) });
      } else {
        await route.continue();
      }
    });

    await page.goto("/tyres/by-vehicle");
    await selectMake(page, "Holden");

    await expect(page.getByText("No models found for Holden.")).toBeVisible();
    const modelSelect = page.getByLabel("Model");
    await expect(modelSelect).toBeDisabled();
    // Page is still intact -- no crash / error boundary.
    await expect(page.getByRole("heading", { name: "Find tyres for your vehicle" })).toBeVisible();
  });

  test("a network failure loading makes degrades to an error message, not a crash", async ({ page }) => {
    await page.route("**/api/vehicles/makes", async (route) => {
      await route.abort("failed");
    });

    await page.goto("/tyres/by-vehicle");

    await expect(page.getByText(/couldn.t reach the server/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Find tyres for your vehicle" })).toBeVisible();
    const makeSelect = page.getByLabel("Make");
    await expect(makeSelect).toBeDisabled();
  });

  test("a server error loading makes degrades to an error message, not a crash", async ({ page }) => {
    await page.route("**/api/vehicles/makes", async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Something went wrong." }) });
    });

    await page.goto("/tyres/by-vehicle");

    await expect(page.getByText("Something went wrong.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Find tyres for your vehicle" })).toBeVisible();
  });
});
