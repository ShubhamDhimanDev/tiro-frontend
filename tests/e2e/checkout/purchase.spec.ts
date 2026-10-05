import { test, expect, type Page } from "@playwright/test";
import { resolveZoneViaApi } from "../helpers/location";
import { loginViaUi, seedActivatedCustomer, seedOrdersForCustomer } from "../helpers/customer-account";

/**
 * The purchase path against the live API: PDP "Add to cart" -> cart (live
 * prices) -> checkout wizard (live availability, real booking hold) -> details
 * with a suburb matched by the API -> order -> payment step -> confirmation.
 *
 * Needs the seeded demo data (`php artisan db:seed --class=DemoCatalogSeeder`:
 * zone 3 "Melbourne CBD Express" with vans, technician shifts for the next 28
 * days) and Redis (slot locks) running.
 *
 * Payment: `POST /orders` creates a Stripe PaymentIntent server-side. With the
 * placeholder `STRIPE_SECRET_KEY` in this environment that call fails (HTTP
 * 500), so the order cannot be created here. The first test therefore proves
 * everything up to "Place order and pay" and accepts either outcome of that
 * click: the payment element/"payment not configured" panel (order created), or
 * the graceful "We couldn't place your order" message (gateway unavailable).
 * The confirmation page itself is proven against a real confirmed order seeded
 * server-side (second test). Once real test keys exist, the first test also
 * covers the payment step.
 */

const VARIANT_SLUG = "bridgestone-turanza-t005-205-55-r16";

async function addTyresToCart(page: Page) {
  await resolveZoneViaApi(page, { postcode: "3000" });
  await page.goto(`/tyres/${VARIANT_SLUG}`);
  await page.getByTestId("pdp-add").click();
  await expect(page.getByText("Added.")).toBeVisible();
}

test.describe("purchase path (live API)", () => {
  test("cart prices come from the API and the wizard holds a real time, takes details and reaches payment", async ({ page }) => {
    test.setTimeout(150_000);
    await addTyresToCart(page);

    // Cart: live price, not a placeholder (4 tyres at the seeded $189.00 list price, any promotion applied by the API).
    await page.goto("/cart");
    const summary = page.getByTestId("cart-total");
    await expect(summary).toContainText("Total", { timeout: 20_000 });
    await expect(page.getByTestId("cart-line").first()).toContainText("$189.00 each");

    await page.getByRole("link", { name: "Checkout", exact: true }).first().click();
    const wizard = page.getByRole("dialog");
    await expect(wizard).toContainText("Step 1 of 4: Date & Time");

    // Step 1: real availability. Pick the first open day, then a time.
    const strip = wizard.getByTestId("fitting-date-strip");
    const days = strip.getByRole("radiogroup");
    await expect(days.getByRole("radio", { disabled: false }).first()).toBeVisible({ timeout: 20_000 });
    await days.getByRole("radio", { disabled: false }).first().click();
    await expect(strip).toContainText(/(slots left|times available) on this day./);
    await strip.locator('label:has(input[name="wizard-time"])').first().click();

    // Next creates the hold (POST /bookings).
    const holdRequest = page.waitForResponse((r) => r.url().includes("/api/booking") && r.request().method() === "POST");
    await wizard.getByTestId("wizard-next").click();
    expect((await holdRequest).status()).toBe(201);
    await expect(wizard).toContainText("Step 2 of 4: Fitting Details");
    await expect(wizard.getByTestId("held-time")).toBeVisible();
    await expect(wizard.getByTestId("wizard-hold")).toContainText(/\d+:\d\d/);

    // Step 2: required fields report errors; a suburb the API does not know is reported.
    await wizard.getByTestId("wizard-next").click();
    await expect(wizard.getByText("Enter your first name.")).toBeVisible();
    await wizard.getByLabel(/First name/).fill("Sam");
    await wizard.getByLabel(/Last name/).fill("Taylor");
    await wizard.getByLabel(/Mobile phone/).fill("0412 345 678");
    await wizard.getByLabel(/Email address/).fill("sam.taylor@example.com");
    await wizard.locator("#manual-line1").fill("12 Example St");
    await wizard.getByRole("combobox", { name: "Suburb" }).fill("Richmond");
    await wizard.getByLabel("State").selectOption("VIC");
    await wizard.getByRole("textbox", { name: "Postcode" }).fill("3121");
    await expect(wizard.getByText("12 Example St, Richmond VIC 3121")).toBeVisible({ timeout: 15_000 });
    await expect(wizard.getByText(/Matching this address/)).toHaveCount(0);
    await wizard.getByTestId("wizard-next").click();

    // Step 3: one wheel per tyre.
    await expect(wizard).toContainText("Step 3 of 4: Select Tyres");
    await wizard.getByTestId("wizard-next").click();
    await expect(wizard.getByText("Select 4 tyres to be replaced (0 selected).")).toBeVisible();
    for (const name of ["Front left", "Front right", "Rear left", "Rear right"]) await wizard.getByLabel(name, { exact: true }).check();
    await wizard.getByLabel("Rego", { exact: true }).fill("abc123");
    await wizard.getByTestId("wizard-next").click();

    // Step 4: summary priced against the hold, then place the order.
    await expect(wizard).toContainText("Step 4 of 4: Payment");
    await expect(wizard.getByTestId("wizard-summary-totals")).toContainText("Total", { timeout: 20_000 });
    const orderRequest = page.waitForRequest((r) => r.url().includes("/api/orders") && r.method() === "POST");
    await wizard.getByTestId("wizard-complete").click();
    const payload = (await orderRequest).postDataJSON() as {
      booking_id: number;
      customer: { name: string; mobile: string };
      address: { suburb_id: number; line1: string };
      vehicle: { rego: string; wheels: string[] };
    };
    expect(payload.booking_id).toBeGreaterThan(0);
    expect(payload.customer).toMatchObject({ name: "Sam Taylor", mobile: "+61412345678" });
    expect(payload.address.suburb_id).toBeGreaterThan(0);
    expect(payload.vehicle.rego).toBe("ABC123");
    expect(payload.vehicle.wheels).toEqual(["FL", "FR", "RL", "RR"]);

    // Either the order exists and the payment step shows, or the gateway is not configured and we say so plainly.
    await expect(wizard.getByTestId("wizard-payment").or(wizard.getByText("We couldn't place your order"))).toBeVisible({ timeout: 30_000 });
    // Card details are never typed into our own inputs.
    await expect(wizard.locator('input[autocomplete="cc-number"]')).toHaveCount(0);
  });

  test("confirmation shows the real order from the API", async ({ page }) => {
    const { email, password } = seedActivatedCustomer("confirm-page");
    const [order] = seedOrdersForCustomer(email, 1);
    await loginViaUi(page, email, password);

    await page.goto(`/checkout/confirmation?order=${order.orderId}`);
    await expect(page.getByRole("heading", { name: `Order ${order.orderNumber}` })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("order-confirmed")).toContainText("You're booked in");
    await expect(page.getByTestId("order-number")).toHaveText(order.orderNumber);
    await expect(page.getByRole("heading", { name: "Your appointment" })).toBeVisible();
  });

  test("confirmation without an order id explains instead of showing a stale local order", async ({ page }) => {
    await page.goto("/checkout/confirmation");
    await expect(page.getByText("No order to show")).toBeVisible();
  });
});
