import type { APIRequestContext } from "@playwright/test";
import { drainOtpQueueAndGetCode, uniqueTestEmail, strongTestPassword } from "./otp";

/**
 * Registers and activates a `Customer` end-to-end through this app's own
 * `/api/auth/*` Route Handlers (not Laravel directly — same boundary the
 * browser itself uses) via Playwright's `request` fixture, rather than
 * driving the registration UI. This is deliberate: registration itself is
 * already covered as its own UI-driven golden path in
 * `auth/registration.spec.ts`; every other spec that merely *needs* an
 * already-registered account as a precondition uses this instead of
 * re-walking that UI every time, per the task brief's suggestion to use "a
 * test fixture/API call" for setup that isn't the thing under test.
 *
 * Still exercises the real backend for real — same OTP-issuing/verifying
 * code path, same `EmailOtpChallenge`/`Customer` rows, same
 * `drainOtpQueueAndGetCode` workaround as everywhere else in this suite.
 */
export async function registerAndActivateCustomer(
  request: APIRequestContext,
  labelForEmail: string
): Promise<{ email: string; password: string }> {
  const email = uniqueTestEmail(labelForEmail);
  const password = strongTestPassword();

  const registerRes = await request.post("/api/auth/register", { data: { email, password } });
  if (!registerRes.ok()) {
    throw new Error(
      `Fixture setup: POST /api/auth/register failed for ${email} — ${registerRes.status()} ${await registerRes.text()}`
    );
  }

  const code = drainOtpQueueAndGetCode(email, "registration");

  const verifyRes = await request.post("/api/auth/register/verify", { data: { email, code } });
  if (!verifyRes.ok()) {
    throw new Error(
      `Fixture setup: POST /api/auth/register/verify failed for ${email} — ${verifyRes.status()} ${await verifyRes.text()}`
    );
  }

  return { email, password };
}
