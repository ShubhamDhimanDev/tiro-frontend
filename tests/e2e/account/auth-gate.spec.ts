import { test, expect } from "@playwright/test";

/**
 * `/account/*` gating for a signed-out visitor — client-side `useAuth()`
 * gate (a friendly "sign in" prompt + Log in link), same pattern
 * `<PriceGuaranteeClaimsList>` already established (`app/account/layout.tsx`'s
 * own doc comment: deliberately no server-side `cookies()` auth check, the
 * Route Handler's own `401` is the real security boundary — see
 * `tests/e2e/account/http.spec.ts` for that). This spec is the UI-gating
 * half: every page must render *something* sane for a signed-out visitor,
 * never a crash/blank page, and the list/edit pages must show the prompt
 * before attempting any authenticated action.
 */

test.describe("account pages: signed-out gating", () => {
  test("the three list pages show a sign-in prompt, not the data view or a crash", async ({ page }) => {
    for (const [path, message] of [
      ["/account/vehicles", "Sign in to manage your saved vehicles."],
      ["/account/addresses", "Sign in to manage your saved addresses."],
      ["/account/orders", "Sign in to see your order history."],
    ] as const) {
      await page.goto(path);
      await expect(page.getByText(message)).toBeVisible();
      // The sign-in-prompt's own "Log in" link — the header nav (signed
      // out) also has one with the same accessible name, so scope to the
      // prompt's link specifically (the primary-button-styled one, always
      // the last "Log in" link in the DOM here) rather than either link.
      await expect(page.getByRole("link", { name: "Log in" }).last()).toHaveAttribute("href", "/login");
    }
  });

  test("the account landing page and nav render without requiring a session", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Your account" })).toBeVisible();
    // The account sub-nav (`<AccountNav>`) and the landing page's own
    // "Saved vehicles"/etc. cards both link to the same paths with
    // overlapping accessible names — scope to the sub-nav specifically.
    const subNav = page.getByRole("navigation").filter({ hasText: "Order history" });
    await expect(subNav.getByRole("link", { name: "Saved vehicles", exact: true })).toHaveAttribute("href", "/account/vehicles");
    await expect(subNav.getByRole("link", { name: "Saved addresses", exact: true })).toHaveAttribute("href", "/account/addresses");
    await expect(subNav.getByRole("link", { name: "Order history", exact: true })).toHaveAttribute("href", "/account/orders");
  });

  test("edit pages (vehicle/address) show a sign-in prompt for a signed-out visitor rather than attempting to load data", async ({ page }) => {
    await page.goto("/account/vehicles/1/edit");
    await expect(page.getByText("Sign in to edit your saved vehicles.")).toBeVisible();

    await page.goto("/account/addresses/1/edit");
    await expect(page.getByText("Sign in to edit your saved addresses.")).toBeVisible();
  });

  /**
   * Regression test for a real gap this suite originally found and
   * frontend-agent has since fixed: unlike every other account-only
   * component in this phase (list pages above, edit pages above,
   * `<PriceGuaranteeClaimsList>` before it), `/account/vehicles/new` and
   * `/account/addresses/new` used to render `<SavedVehicleForm>`/
   * `<SavedAddressForm>` directly with no `useAuth()` gate at all — a
   * signed-out visitor could fill in the whole add-vehicle/add-address form
   * and only discover they needed to sign in from a generic error banner
   * after submitting. Both components now gate signed-out visitors the same
   * way their edit-mode counterparts always did (`FormNotice` + "Log in"
   * link, before rendering any form fields) — verified directly against a
   * real browser, not just the code fix.
   */
  test("/account/vehicles/new and /account/addresses/new gate signed-out visitors the same way every sibling account page does", async ({
    page,
  }) => {
    await page.goto("/account/vehicles/new");
    await expect(page.getByText("Sign in to add a saved vehicle.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Registration (rego, optional)" })).toHaveCount(0);

    await page.goto("/account/addresses/new");
    await expect(page.getByText("Sign in to add a saved address.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Street address" })).toHaveCount(0);
  });
});
