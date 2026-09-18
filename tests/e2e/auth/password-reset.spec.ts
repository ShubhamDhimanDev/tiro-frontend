import { test, expect } from "@playwright/test";
import { registerAndActivateCustomer } from "../helpers/fixtures";
import { drainOtpQueueAndGetCode, strongTestPassword } from "../helpers/otp";

/**
 * Password reset (docs/architecture/08-customer-auth-otp.md §4): request →
 * code + new-password in one combined step → lands signed in immediately
 * afterward — no bounce to a second login step, per §4's explicit "issue a
 * fresh token immediately" recommendation.
 */
test.describe("password reset", () => {
  test("request → code + new password lands an authenticated session, and the old password stops working", async ({
    page,
    request,
  }) => {
    const { email, password: oldPassword } = await registerAndActivateCustomer(request, "pw-reset");
    const newPassword = strongTestPassword();

    await page.goto("/password-reset");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset code" }).click();

    const codeInput = page.getByLabel("Verification code");
    await expect(codeInput).toBeVisible();
    const newPasswordInput = page.getByLabel("New password");
    await expect(newPasswordInput).toBeVisible();

    const code = drainOtpQueueAndGetCode(email, "password_reset");
    await codeInput.fill(code);
    await newPasswordInput.fill(newPassword);
    await page.getByRole("button", { name: "Reset password and log in" }).click();

    // §4: fresh session immediately, no second login step.
    await expect(page).toHaveURL("/");
    await expect(page.getByText(/^Hi, /)).toBeVisible();

    // Log out, then confirm the reset actually took: old password now fails,
    // new password now works.
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(oldPassword);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel("Password").fill(newPassword);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByText(/^Hi, /)).toBeVisible();
  });
});
