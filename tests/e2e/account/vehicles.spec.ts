import { test, expect } from "@playwright/test";
import { seedActivatedCustomer, loginViaUi } from "../helpers/customer-account";

/**
 * Saved vehicles CRUD (Phase 7) — `/account/vehicles*` against the real
 * `/api/v1/customer/vehicles*` endpoints. Covers both documented
 * `saved_fitment` source shapes: the vehicle-lookup cascade (resolves
 * `vehicle_id` + the catalogue's own `VehicleFitments`, seeded by
 * `VehicleSeeder` — Holden Commodore is the genuinely-staggered case) and
 * customer-typed sizes (`all` and `front`+`rear`).
 */

test.describe("saved vehicles: vehicle-lookup cascade (staggered)", () => {
  test("add via the make/model/year cascade, edit, set default, then delete", async ({ page }) => {
    const { email, password } = seedActivatedCustomer("veh-cascade");
    await loginViaUi(page, email, password);

    await page.goto("/account/vehicles/new");
    await page.getByRole("radio", { name: "Look up my vehicle" }).click();
    await page.getByRole("button", { name: "Look up my vehicle by make/model/year" }).click();

    await page.getByLabel("Make").selectOption("Holden");
    await page.getByLabel("Model").selectOption("Commodore");
    await page.getByLabel("Year").selectOption("2013-2017");
    await expect(page.getByText("Fitment found for Holden Commodore")).toBeVisible();

    await page.getByRole("textbox", { name: "Registration (rego, optional)" }).fill("ABC123");
    await page.getByRole("button", { name: "Save vehicle" }).click();

    await expect(page).toHaveURL("/account/vehicles");
    await expect(page.getByText("Holden Commodore")).toBeVisible();
    await expect(page.getByText("Front 245/45 R18 · Rear 245/40 R19")).toBeVisible();
    await expect(page.getByText("ABC123")).toBeVisible();

    // Set as default.
    await expect(page.getByText("Default", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Set as default" }).click();
    await expect(page.getByText("Default", { exact: true })).toBeVisible();

    // Edit: change the nickname without re-resolving the vehicle.
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.getByText(/^Current: Holden Commodore/)).toBeVisible();
    await page.getByRole("textbox", { name: "Nickname (optional)" }).fill("Dad's car");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL("/account/vehicles");
    await expect(page.getByText("Dad's car")).toBeVisible();
    // Fitment survived the edit unmodified (re-submitted verbatim, not re-resolved).
    await expect(page.getByText("Front 245/45 R18 · Rear 245/40 R19")).toBeVisible();

    // Delete.
    await page.getByRole("button", { name: "Delete" }).click();
    // Deletion is confirmed in an in-page dialog (was window.confirm).
    await page.getByRole("dialog").getByRole("button", { name: "Yes, remove" }).click();
    await expect(page.getByText("You haven't saved any vehicles yet")).toBeVisible();
  });
});

test.describe("saved vehicles: customer-typed fitment", () => {
  test("add a single (non-staggered) manually-typed size", async ({ page }) => {
    const { email, password } = seedActivatedCustomer("veh-manual-single");
    await loginViaUi(page, email, password);

    await page.goto("/account/vehicles/new");
    // "Enter tyre size manually" is the default-selected radio already.
    await page.getByRole("textbox", { name: "Width" }).fill("225");
    await page.getByRole("textbox", { name: "Profile" }).fill("45");
    await page.getByRole("textbox", { name: "Rim (in)" }).fill("17");
    await page.getByRole("button", { name: "Save vehicle" }).click();

    await expect(page).toHaveURL("/account/vehicles");
    await expect(page.getByText("225/45 R17")).toBeVisible();
  });

  test("add a staggered (front/rear differ) manually-typed size", async ({ page }) => {
    const { email, password } = seedActivatedCustomer("veh-manual-staggered");
    await loginViaUi(page, email, password);

    await page.goto("/account/vehicles/new");
    await page.getByRole("checkbox", { name: "Front and rear are different sizes" }).check();

    // `<SizeFields label="Front"|"Rear">` (`components/account/saved-vehicle-form.tsx`)
    // gives each input a `${label}-{field}` id — more reliable than a
    // role/name query here since "Width"/"Profile"/"Rim (in)" labels repeat
    // once per side once staggered mode is on.
    await page.locator("#Front-width").fill("215");
    await page.locator("#Front-profile").fill("50");
    await page.locator("#Front-rim").fill("17");

    await page.locator("#Rear-width").fill("235");
    await page.locator("#Rear-profile").fill("45");
    await page.locator("#Rear-rim").fill("17");

    await page.getByRole("button", { name: "Save vehicle" }).click();

    await expect(page).toHaveURL("/account/vehicles");
    await expect(page.getByText("Front 215/50 R17 · Rear 235/45 R17")).toBeVisible();
  });

  test("editing a manually-typed vehicle pre-fills the existing size for editing", async ({ page }) => {
    const { email, password } = seedActivatedCustomer("veh-manual-edit");
    await loginViaUi(page, email, password);

    await page.goto("/account/vehicles/new");
    await page.getByRole("textbox", { name: "Width" }).fill("205");
    await page.getByRole("textbox", { name: "Profile" }).fill("55");
    await page.getByRole("textbox", { name: "Rim (in)" }).fill("16");
    await page.getByRole("button", { name: "Save vehicle" }).click();
    await expect(page).toHaveURL("/account/vehicles");

    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.getByRole("textbox", { name: "Width" })).toHaveValue("205");
    await expect(page.getByRole("textbox", { name: "Profile" })).toHaveValue("55");
    await expect(page.getByRole("textbox", { name: "Rim (in)" })).toHaveValue("16");
  });
});
