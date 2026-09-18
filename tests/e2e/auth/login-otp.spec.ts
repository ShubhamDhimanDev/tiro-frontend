import { test, expect } from "@playwright/test";
import { registerAndActivateCustomer } from "../helpers/fixtures";
import { drainOtpQueueAndGetCode, uniqueTestEmail } from "../helpers/otp";

/**
 * OTP login (docs/architecture/08-customer-auth-otp.md §3b) — the second of
 * two independent, permanent login methods, tested here as its own complete
 * path rather than a variant of registration's verify step: request a code,
 * submit it, land authenticated, with no password involved anywhere.
 */
test.describe("login via OTP", () => {
  test("an already-registered account requests a code and logs in with it, independently of password", async ({
    page,
    request,
  }) => {
    const { email } = await registerAndActivateCustomer(request, "login-otp");

    await page.goto("/login");
    await page.getByRole("button", { name: "Email code" }).click();
    await expect(page.getByRole("button", { name: "Email code" })).toHaveAttribute("aria-pressed", "true");

    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send code" }).click();

    const codeInput = page.getByLabel("Verification code");
    await expect(codeInput).toBeVisible();

    const code = drainOtpQueueAndGetCode(email, "login");
    await codeInput.fill(code);
    await page.getByRole("button", { name: "Log in", exact: true }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(/^Hi, /)).toBeVisible();
  });

  test("verifying a code for an email that was never registered gives the actionable 'no account' message, not the login flow's usual generic one", async ({
    page,
  }) => {
    const email = uniqueTestEmail("login-otp-unregistered");

    await page.goto("/login");
    await page.getByRole("button", { name: "Email code" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send code" }).click();

    const codeInput = page.getByLabel("Verification code");
    await expect(codeInput).toBeVisible();

    // requestOtp() always issues+sends a challenge regardless of whether the
    // email is registered (§3b) — a real code exists to fetch even here.
    const code = drainOtpQueueAndGetCode(email, "login");
    await codeInput.fill(code);
    await page.getByRole("button", { name: "Log in", exact: true }).click();

    // §3b/§12: this is the one deliberately specific failure in the whole
    // auth surface — the caller just proved inbox ownership, so "no account
    // yet" is safe to disclose here.
    await expect(page.getByText(/no account found for this email/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Create an account with this email" })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
