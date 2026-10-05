import { test, expect } from "@playwright/test";
import { drainOtpQueueAndGetCode, uniqueTestEmail, strongTestPassword } from "../helpers/otp";

/**
 * Registration → session (task-breakdown Phase 0 "storefront E2E" row,
 * docs/architecture/08-customer-auth-otp.md §2): password + email submitted
 * up front, account activates only after a real OTP code is verified — not
 * a magic link, an actual code-entry step. This is also the guest-history
 * claim entry point (§10), though the claim scenario itself needs real cart
 * checkout (Phase 4) to set up and isn't buildable yet — see this suite's
 * report for that deferral.
 */
test.describe("registration", () => {
  test("password + OTP verify lands an authenticated session", async ({ page }) => {
    const email = uniqueTestEmail("register");
    const password = strongTestPassword();

    await page.goto("/register");

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    // Lands on the code-entry step — not a magic link, a real 6-digit input.
    // The notice shown is the backend's own action-only success message
    // (AuthController::register()'s `{message}` body), not the component's
    // generic fallback copy — assert the real one so this doesn't silently
    // stop verifying the backend response actually reached the form.
    const codeInput = page.getByLabel("Verification code");
    await expect(codeInput).toBeVisible();
    await expect(
      page.getByText("We have emailed you a verification code to finish creating your account.")
    ).toBeVisible();

    const code = drainOtpQueueAndGetCode(email, "registration");
    await codeInput.fill(code);
    await page.getByRole("button", { name: "Verify and create account" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(/^Hi, /)).toBeVisible();
    // Scoped to the header (`<header>`'s implicit `banner` landmark, unique
    // sitewide) — `<SiteFooter>` always renders a static "Log in" link
    // regardless of session state (by design, it's not auth-aware), so an
    // unscoped page-wide query would wrongly still find one after login.
    await expect(page.getByRole("banner").getByRole("link", { name: "Log in" })).toHaveCount(0);
  });

  test("registering an email that's already activated is rejected with a specific error, not a generic one", async ({
    page,
    request,
  }) => {
    // This test deliberately waits out a real 60s rate-limit window below —
    // needs more than the suite's default per-test timeout.
    test.setTimeout(90_000);

    // Precondition: an already-activated account. Deliberately via the API
    // boundary (not the UI) since the UI registration path itself is what
    // the test above already covers — this test is about the *second*
    // attempt's behavior.
    const email = uniqueTestEmail("register-dupe");
    const password = strongTestPassword();

    const setupStartedAt = Date.now();
    const registerRes = await request.post("/api/auth/register", { data: { email, password } });
    expect(registerRes.ok()).toBeTruthy();
    const code = drainOtpQueueAndGetCode(email, "registration");
    const verifyRes = await request.post("/api/auth/register/verify", { data: { email, code } });
    expect(verifyRes.ok()).toBeTruthy();

    // `POST /api/v1/auth/register` carries its own 60s-per-email resend
    // cooldown (docs/architecture/08-customer-auth-otp.md §6) on the route
    // itself, ahead of the controller's "already activated" business-logic
    // check — so calling it again for the same email inside that window
    // (as this test deliberately does, to re-submit the same address) gets
    // masked by a 429 "Too Many Attempts" instead of the specific rejection
    // this test wants to observe. A real customer re-registering a genuinely
    // old, already-activated account would essentially never hit this,
    // since there'd be no recent request for that email — this wait exists
    // purely to un-collapse the two calls this test intentionally makes in
    // quick succession, not to work around a product bug.
    const cooldownRemainingMs = 61_000 - (Date.now() - setupStartedAt);
    if (cooldownRemainingMs > 0) {
      await page.waitForTimeout(cooldownRemainingMs);
    }

    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(strongTestPassword());
    await page.getByRole("button", { name: "Create account" }).click();

    // §2: registration is allowed to disclose this explicitly, unlike login's
    // generic non-disclosure — "an account already exists ... log in instead."
    // Rendered twice (the form-level FormError banner and the email field's
    // own inline error, both fed by the same 422 `{message, errors.email}`
    // body) — `.first()` just picks one, both carry the same text.
    await expect(page.getByText(/already exists for this email/i).first()).toBeVisible();
    // Must NOT have advanced to the code-entry step.
    await expect(page.getByLabel("Verification code")).toHaveCount(0);
  });
});
