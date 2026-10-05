import { test, expect } from "@playwright/test";
import { seedActivatedCustomer, seedAddressReferencedByOrder, loginViaUi } from "../helpers/customer-account";
import { fillManualAddress } from "../helpers/manual-address";

/**
 * Saved addresses CRUD (Phase 7) — `/account/addresses*` against the real
 * `/api/v1/customer/addresses*` endpoints, plus the `409`-referenced-by-
 * order delete case (the task brief's specific "place a real order against
 * a saved address, confirm the UI correctly shows 'unset as default'
 * instead of a broken/silent delete attempt" requirement).
 *
 * `POST /api/v1/orders` can't be driven through the real checkout UI in
 * this environment right now (see `tests/e2e/checkout/prefill.spec.ts`'s
 * doc comment) — `seedAddressReferencedByOrder()` creates the same *data
 * shape* a real order would have left behind (an `Address` owned by the
 * customer, referenced by a real `Order` row) directly, so this spec still
 * exercises the actual `409` response and the actual UI reaction to it for
 * real, only substituting how the referencing `Order` came to exist.
 */

test.describe("saved addresses: CRUD", () => {
  test("add via the manual-entry fallback, edit, set default, then delete", async ({ page }) => {
    const { email, password } = seedActivatedCustomer("addr-crud");
    await loginViaUi(page, email, password);

    await page.goto("/account/addresses/new");
    await page.getByRole("textbox", { name: "Nickname (optional)" }).fill("Home");
    await fillManualAddress(page, { line1: "12 Example St", suburb: "Richmond", state: "VIC", postcode: "3121" });
    await expect(page.locator("#saved-address-line1")).toHaveValue("12 Example St");

    await page.getByRole("button", { name: "Save address" }).click();

    await expect(page).toHaveURL("/account/addresses");
    await expect(page.getByText("Home", { exact: true })).toBeVisible();
    await expect(page.getByText("12 Example St, Richmond VIC 3121")).toBeVisible();

    // Set as default.
    await page.getByRole("button", { name: "Set as default" }).click();
    await expect(page.getByText("Default", { exact: true })).toBeVisible();

    // Edit: change the nickname without re-picking the address.
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.getByText(/^12 Example St, Richmond VIC/)).toBeVisible();
    await page.getByRole("textbox", { name: "Nickname (optional)" }).fill("Home (renamed)");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL("/account/addresses");
    await expect(page.getByText("Home (renamed)")).toBeVisible();

    // Delete (no order references it — hard delete succeeds, real 204).
    const deleteResponse = page.waitForResponse((res) => res.url().includes("/api/customer/addresses/") && res.request().method() === "DELETE");
    await page.getByRole("button", { name: "Delete" }).click();
    // Deletion is confirmed in an in-page dialog (was window.confirm).
    await page.getByRole("dialog").getByRole("button", { name: "Yes, remove" }).click();
    expect((await deleteResponse).status()).toBe(204);
    await expect(page.getByText("You haven't saved any addresses yet")).toBeVisible();
  });

  /**
   * Regression test for a real bug this suite originally found and
   * frontend-agent has since fixed (`components/checkout/address-autocomplete.tsx`'s
   * `ManualAddressFields`, see `tests/e2e/helpers/manual-address.ts`'s doc
   * comment for the fixed mechanism): the State `<select>` used to call
   * `commit()` synchronously in its own `onChange`, before the `setState` it
   * just triggered had actually applied, so picking State *last* (after
   * street/suburb/postcode) — a completely natural top-to-bottom fill order
   * — never fired the suburb lookup at all. Now driven by a `useEffect`
   * watching all four fields together, so completeness is judged fresh on
   * every run regardless of which field was touched last. Deliberately does
   * NOT use `fillManualAddress()` (which happens to fill State before
   * Postcode) — this test exists specifically to exercise the
   * previously-buggy order directly, confirming it now resolves rather than
   * merely not-regressing a different order.
   */
  test("resolves the suburb correctly even when State is filled last (after street/suburb/postcode)", async ({ page }) => {
    const { email, password } = seedActivatedCustomer("addr-state-last-order");
    await loginViaUi(page, email, password);

    await page.goto("/account/addresses/new");
    await page.locator("#manual-line1").fill("12 Example St");
    await page.getByRole("combobox", { name: "Suburb" }).fill("Richmond");
    await page.getByRole("textbox", { name: "Postcode" }).fill("3121");

    const suburbLookup = page.waitForResponse((res) => res.url().includes("/api/suburbs"));
    await page.getByLabel("State").selectOption("VIC");
    await suburbLookup;

    await expect(page.locator("#saved-address-line1")).toHaveValue("12 Example St", { timeout: 10_000 });

    await page.getByRole("button", { name: "Save address" }).click();
    await expect(page).toHaveURL("/account/addresses");
    await expect(page.getByText("12 Example St, Richmond VIC 3121")).toBeVisible();
  });
});

test.describe("saved addresses: 409 referenced-by-order delete", () => {
  test("deleting an address still referenced by a real order is refused (409), offering 'set a different default' instead of a delete button", async ({ page }) => {
    const { email, password } = seedActivatedCustomer("addr-409");
    const { addressId } = seedAddressReferencedByOrder(email, { addressLabel: "Referenced Address" });
    await loginViaUi(page, email, password);

    await page.goto("/account/addresses");
    await expect(page.getByText("Referenced Address")).toBeVisible();
    await expect(page.getByText("Default", { exact: true })).toBeVisible(); // seeded as the customer's only/default address

    const deleteResponse = page.waitForResponse(
      (res) => res.url().endsWith(`/api/customer/addresses/${addressId}`) && res.request().method() === "DELETE"
    );
    await page.getByRole("button", { name: "Delete" }).click();
    // Deletion is confirmed in an in-page dialog (was window.confirm).
    await page.getByRole("dialog").getByRole("button", { name: "Yes, remove" }).click();

    expect((await deleteResponse).status()).toBe(409);
    await expect(
      page.getByText("This address is attached to an order and can't be removed — you can stop it being your default instead.")
    ).toBeVisible();
    // The delete button is gone for this row now — no broken/silent retry path.
    await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
    // Still editable, and the row didn't vanish from the list.
    await expect(page.getByRole("link", { name: "Edit" })).toBeVisible();

    // The "you can stop it being your default instead" promise is real:
    // adding a second address and promoting it un-defaults the referenced
    // one (there's no standalone "unset default" action — the only way to
    // clear a row's `is_default` is to make a different row default
    // instead, which is what this exercises).
    await page.goto("/account/addresses/new");
    await fillManualAddress(page, { line1: "99 Second St", suburb: "St Kilda", state: "VIC", postcode: "3182" });
    await page.getByRole("button", { name: "Save address" }).click();
    await expect(page).toHaveURL("/account/addresses");

    await page
      .locator("li", { has: page.getByText("99 Second St", { exact: false }) })
      .getByRole("button", { name: "Set as default" })
      .click();

    const referencedRow = page.locator("li", { has: page.getByText("Referenced Address") });
    await expect(referencedRow.getByText("Default", { exact: true })).toHaveCount(0);
    await expect(referencedRow.getByRole("button", { name: "Set as default" })).toBeVisible();

    // Still can't be hard-deleted though — the order reference alone blocks
    // it regardless of default status, which is the correct, permanent
    // behavior (an order's own address must never disappear from under it).
    const secondDeleteResponse = page.waitForResponse(
      (res) => res.url().endsWith(`/api/customer/addresses/${addressId}`) && res.request().method() === "DELETE"
    );
    await referencedRow.getByRole("button", { name: "Delete" }).click();
    // Deletion is confirmed in an in-page dialog (was window.confirm).
    await page.getByRole("dialog").getByRole("button", { name: "Yes, remove" }).click();
    expect((await secondDeleteResponse).status()).toBe(409);
  });
});
