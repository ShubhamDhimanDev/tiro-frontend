import { test, expect, type Page } from "@playwright/test";
import {
  seedActivatedCustomer,
  loginViaUi,
  seedPendingHoldBooking,
  setGuestBookingManageTokenCookie,
} from "../helpers/customer-account";
import { fillManualAddress } from "../helpers/manual-address";
import { seedCartLocalStorage } from "../helpers/cart";

/**
 * Checkout wizard's saved-address / saved-vehicle prefill for a signed-in
 * customer, and a guest session being unaffected (frontend-only, no backend
 * contract change: `POST /api/v1/orders` still takes complete address/vehicle
 * objects, never a saved-id reference).
 *
 * `/checkout?booking=<id>` re-opens an existing hold at step 2, which is how
 * these specs get past step 1 without driving the slot picker (that is
 * `purchase.spec.ts`). `seedPendingHoldBooking()` /
 * `setGuestBookingManageTokenCookie()` stand in for "how a valid
 * `pending_hold` booking came to exist".
 *
 * `POST /api/v1/orders` itself cannot complete while `STRIPE_SECRET_KEY` in
 * `backend/.env` is a placeholder (the PaymentIntent is created inside the
 * order transaction, so the call 500s and nothing persists). These specs assert
 * up to and including the real `POST /api/orders` request payload, which proves
 * the prefill -> submit wiring end to end on this app's side.
 */

const ITEMS = [{ tyre_variant_id: 1, quantity: 4, label: "Bridgestone Turanza T005 205/55 R16", slug: "bridgestone-turanza-t005-205-55-r16" }];

async function openWizardOnHold(page: Page, bookingId: number) {
  await page.goto("/");
  await seedCartLocalStorage(page, ITEMS);
  await page.goto(`/checkout?booking=${bookingId}`);
  const wizard = page.getByRole("dialog");
  await expect(wizard).toContainText("Step 2 of 4: Fitting Details", { timeout: 30_000 });
  return wizard;
}

test.describe("checkout prefill: signed-in customer", () => {
  test("selecting a saved address/vehicle prefills the corresponding fields and the submitted payload is a complete object, not a reference", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    const { email, password } = seedActivatedCustomer("checkout-prefill");
    await loginViaUi(page, email, password);

    // Seed one saved address and one saved vehicle for this customer via the real account UI.
    await page.goto("/account/addresses/new");
    await fillManualAddress(page, { line1: "12 Example St", suburb: "Richmond", state: "VIC", postcode: "3121" });
    await page.getByRole("button", { name: "Save address" }).click();
    await expect(page).toHaveURL("/account/addresses");

    await page.goto("/account/vehicles/new");
    await page.getByRole("textbox", { name: "Registration (rego, optional)" }).fill("XYZ999");
    await page.getByRole("textbox", { name: "Width" }).fill("205");
    await page.getByRole("textbox", { name: "Profile" }).fill("55");
    await page.getByRole("textbox", { name: "Rim (in)" }).fill("16");
    await page.getByRole("button", { name: "Save vehicle" }).click();
    await expect(page).toHaveURL("/account/vehicles");

    const { bookingId } = seedPendingHoldBooking(email);
    const wizard = await openWizardOnHold(page, bookingId);

    // Contact is prefilled from the account; a mobile may be missing on a seeded customer.
    await expect(wizard.getByLabel(/Email address/)).toHaveValue(email);
    if (!(await wizard.getByLabel(/Mobile phone/).inputValue())) await wizard.getByLabel(/Mobile phone/).fill("0412 345 678");

    const savedAddressSelect = wizard.getByLabel("Use a saved address");
    await expect(savedAddressSelect).toBeVisible();
    const addressOptionValue = await savedAddressSelect.locator("option", { hasText: "12 Example St" }).getAttribute("value");
    await savedAddressSelect.selectOption(addressOptionValue!);
    await expect(wizard.getByText("12 Example St, Richmond VIC 3121")).toBeVisible();
    await wizard.getByTestId("wizard-next").click();

    const savedVehicleSelect = wizard.getByLabel("Use a saved vehicle");
    await expect(savedVehicleSelect).toBeVisible();
    const vehicleOptionValue = await savedVehicleSelect.locator("option", { hasText: "XYZ999" }).getAttribute("value");
    await savedVehicleSelect.selectOption(vehicleOptionValue!);
    await expect(wizard.getByLabel("Rego", { exact: true })).toHaveValue("XYZ999");
    for (const name of ["Front left", "Front right", "Rear left", "Rear right"]) await wizard.getByLabel(name, { exact: true }).check();
    await wizard.getByTestId("wizard-next").click();

    await expect(wizard).toContainText("Step 4 of 4: Payment");
    const orderRequest = page.waitForRequest((req) => req.url().includes("/api/orders") && req.method() === "POST");
    await wizard.getByTestId("wizard-complete").click();
    const payload = (await orderRequest).postDataJSON() as {
      booking_id: number;
      address: { suburb_id: number; line1: string; lat: number; lng: number };
      vehicle: { rego: string | null; vehicle_id: number | null };
    };

    expect(payload.booking_id).toBe(bookingId);
    // Complete objects, not a `saved_address_id`/`saved_vehicle_id` reference.
    expect(payload.address).toMatchObject({ line1: "12 Example St", suburb_id: expect.any(Number) });
    expect(payload.address.suburb_id).not.toBe(0); // the saved row's own suburb id, not the unresolved sentinel
    expect(payload.vehicle.rego).toBe("XYZ999");
    expect(payload).not.toHaveProperty("saved_address_id");
    expect(payload).not.toHaveProperty("saved_vehicle_id");
  });
});

test.describe("checkout prefill: guest session is completely unaffected", () => {
  test("no saved-item UI appears, and no failed fetch visibly breaks the flow", async ({ page }) => {
    test.setTimeout(90_000);
    const { bookingId, manageToken } = seedPendingHoldBooking(null);
    // Establish a real origin for `addCookies()`, then set the guest manage token and load the wizard on that hold.
    await page.goto("/");
    await setGuestBookingManageTokenCookie(page, bookingId, manageToken!);
    const wizard = await openWizardOnHold(page, bookingId);

    // Genuinely signed out.
    await expect(page.getByRole("banner").getByRole("link", { name: "Log in" })).toBeVisible();

    await expect(wizard.getByTestId("held-time")).toBeVisible();
    // No prefill UI at all for a guest: not present, not present-but-empty.
    await expect(wizard.getByText("Use a saved address")).toHaveCount(0);
    await expect(wizard.getByRole("heading", { name: "Your information" })).toBeVisible();
    await expect(wizard.getByRole("heading", { name: "Tyre fitting address" })).toBeVisible();
    await wizard.getByTestId("wizard-next").click();
    await expect(wizard.getByText("Enter your first name.")).toBeVisible();
  });
});
