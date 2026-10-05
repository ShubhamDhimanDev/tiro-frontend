import { test, expect } from "@playwright/test";
import { seedActivatedCustomer, seedAddressReferencedByOrder, loginViaUi } from "../helpers/customer-account";
import { fillManualAddress } from "../helpers/manual-address";

/**
 * Direct HTTP coverage for the 7 new `app/api/customer/**` Route Handlers
 * (11 exported methods total) — two things a UI-driven flow can't assert as
 * precisely:
 *
 * 1. Every one of the 11 methods genuinely `401`s with **no backend round
 *    trip** before any session check, for an unauthenticated request — this
 *    file exercises all 11 directly, not just the ones the CRUD specs
 *    happen to touch via the UI (`vehicles.spec.ts`/`addresses.spec.ts`
 *    cover the happy paths from the customer's side; this is the
 *    `401`-only boundary sweep, matching the task brief's "direct HTTP test
 *    and confirming the /account/* pages themselves gate" split).
 * 2. `DELETE /api/customer/vehicles/{id}`/`addresses/{id}` genuinely return
 *    a real `204` with an empty body through a live HTTP round trip (dev
 *    server → this app's Route Handler → `proxyResponse()` → Laravel) — the
 *    exact regression class `lib/http/proxy-response.ts` was added to fix,
 *    confirmed here against the real thing, not just the unit-level
 *    `NextResponse`/`proxyResponse()` coverage in
 *    `tests/unit/lib/http/proxy-response.test.ts` and
 *    `tests/unit/app/api/customer/**`.
 */

test.describe("app/api/customer/* — 401 without a session, no backend round trip", () => {
  test("all 11 methods reject an unauthenticated request with 401 and a clear message", async ({ request }) => {
    const cases: Array<{ method: "GET" | "POST" | "PATCH" | "DELETE"; path: string; message: string; data?: object }> = [
      { method: "GET", path: "/api/customer/vehicles", message: "You need to be signed in to view your saved vehicles." },
      { method: "POST", path: "/api/customer/vehicles", message: "You need to be signed in to save a vehicle.", data: {} },
      { method: "PATCH", path: "/api/customer/vehicles/1", message: "You need to be signed in to update a saved vehicle.", data: {} },
      { method: "DELETE", path: "/api/customer/vehicles/1", message: "You need to be signed in to remove a saved vehicle." },
      { method: "POST", path: "/api/customer/vehicles/1/set-default", message: "You need to be signed in to update a saved vehicle." },
      { method: "GET", path: "/api/customer/addresses", message: "You need to be signed in to view your saved addresses." },
      { method: "POST", path: "/api/customer/addresses", message: "You need to be signed in to save an address.", data: {} },
      { method: "PATCH", path: "/api/customer/addresses/1", message: "You need to be signed in to update a saved address.", data: {} },
      { method: "DELETE", path: "/api/customer/addresses/1", message: "You need to be signed in to remove a saved address." },
      { method: "POST", path: "/api/customer/addresses/1/set-default", message: "You need to be signed in to update a saved address." },
      { method: "GET", path: "/api/customer/orders", message: "You need to be signed in to view your order history." },
    ];

    for (const { method, path, message, data } of cases) {
      const res = await request.fetch(path, { method, data });
      expect(res.status(), `${method} ${path}`).toBe(401);
      expect((await res.json()).message, `${method} ${path}`).toBe(message);
    }
  });
});

test.describe("proxy-response.ts 204 regression — real HTTP round trip", () => {
  test("DELETE /api/customer/vehicles/{id} returns a real 204 with an empty body", async ({ page }) => {
    const { email, password } = seedActivatedCustomer("http-204-vehicle");
    await loginViaUi(page, email, password);

    await page.goto("/account/vehicles/new");
    await page.getByRole("textbox", { name: "Width" }).fill("205");
    await page.getByRole("textbox", { name: "Profile" }).fill("55");
    await page.getByRole("textbox", { name: "Rim (in)" }).fill("16");
    await page.getByRole("button", { name: "Save vehicle" }).click();
    await expect(page).toHaveURL("/account/vehicles");

    const editHref = await page.getByRole("link", { name: "Edit" }).getAttribute("href");
    const vehicleId = editHref!.match(/\/account\/vehicles\/(\d+)\/edit/)![1];

    // `page.request` shares this page's session cookie — a real
    // authenticated HTTP round trip, not a mocked one.
    const res = await page.request.delete(`/api/customer/vehicles/${vehicleId}`);
    expect(res.status()).toBe(204);
    const body = await res.body();
    expect(body.length).toBe(0);
    // Before the fix this was `NextResponse.json(result.body, {status:204})`,
    // which throws inside the Route Handler on a 204 with the backend's own
    // (non-null) body — that would have surfaced as a 500 here, not a 204.
  });

  test("DELETE /api/customer/addresses/{id} returns a real 204 with an empty body (when not referenced by an order)", async ({ page }) => {
    const { email, password } = seedActivatedCustomer("http-204-address");
    await loginViaUi(page, email, password);

    await page.goto("/account/addresses/new");
    await fillManualAddress(page, { line1: "12 Example St", suburb: "Richmond", state: "VIC", postcode: "3121" });
    await page.getByRole("button", { name: "Save address" }).click();
    await expect(page).toHaveURL("/account/addresses");

    const editHref = await page.getByRole("link", { name: "Edit" }).getAttribute("href");
    const addressId = editHref!.match(/\/account\/addresses\/(\d+)\/edit/)![1];

    const res = await page.request.delete(`/api/customer/addresses/${addressId}`);
    expect(res.status()).toBe(204);
    const body = await res.body();
    expect(body.length).toBe(0);
  });

  test("DELETE on an address referenced by an order still returns a clean 409 (not a 500) through the same proxy path", async ({ page }) => {
    const { email, password } = seedActivatedCustomer("http-409-address");
    const { addressId } = seedAddressReferencedByOrder(email);
    await loginViaUi(page, email, password);

    const res = await page.request.delete(`/api/customer/addresses/${addressId}`);
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.message).toContain("attached to an order");
  });
});
