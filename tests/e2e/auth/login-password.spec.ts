import { test, expect } from "@playwright/test";
import { registerAndActivateCustomer } from "../helpers/fixtures";
import { uniqueTestEmail, strongTestPassword } from "../helpers/otp";

/**
 * Password login (docs/architecture/08-customer-auth-otp.md §3a) — one of
 * two independent, permanent login methods. Key correctness property under
 * test: a wrong password must show the *same* generic message regardless of
 * whether the email is real, unverified, or just has the wrong password —
 * §3a/§7's explicit non-disclosure rule.
 */
test.describe("login via password", () => {
  test("an already-registered account logs in with email + password", async ({ page, request }) => {
    const { email, password } = await registerAndActivateCustomer(request, "login-pw");

    await page.goto("/login");
    // Password tab is the default — assert it's actually selected before relying on it.
    await expect(page.getByRole("button", { name: "Password", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(/^Hi, /)).toBeVisible();
  });

  test("a wrong password shows the identical generic error whether or not the email is registered", async ({
    page,
    request,
  }) => {
    const { email: realEmail } = await registerAndActivateCustomer(request, "login-pw-wrong");
    const neverRegisteredEmail = uniqueTestEmail("login-pw-unknown");

    await page.goto("/login");

    // Case 1: real, activated account — wrong password.
    await page.getByLabel("Email").fill(realEmail);
    await page.getByLabel("Password").fill(strongTestPassword());
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    const errorOnRealAccount = await page.getByRole("alert").innerText();

    // Must not have logged in.
    await expect(page).toHaveURL(/\/login/);

    // Case 2: an email nobody has ever registered.
    await page.getByLabel("Email").fill(neverRegisteredEmail);
    await page.getByLabel("Password").fill(strongTestPassword());
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    const errorOnUnknownAccount = await page.getByRole("alert").innerText();

    // The whole point of §3a/§7: these two failure causes must be
    // indistinguishable to the caller.
    expect(errorOnUnknownAccount).toBe(errorOnRealAccount);
    expect(errorOnRealAccount.toLowerCase()).not.toContain("exist");
    expect(errorOnRealAccount.toLowerCase()).not.toContain("password"); // wouldn't confirm "the email was right, the password was wrong"
    await expect(page).toHaveURL(/\/login/);
  });
});
