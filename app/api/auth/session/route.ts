import { NextResponse } from "next/server";
import { getAuthToken, clearAuthSession, getSessionCustomer } from "@/lib/auth/cookies";
import { authBackend } from "@/lib/auth/backend";

/**
 * GET /api/auth/session — not part of the backend-agent contract (§12 has
 * no such endpoint); this is a frontend-only read of the session snapshot
 * cookie, used by `<AuthProvider>` to hydrate client-side session state on
 * mount without forcing the root layout into dynamic SSR (see
 * components/auth/auth-provider.tsx for why that matters here). Always 200;
 * `customer` is `null` when signed out.
 */
export async function GET() {
  const customer = await getSessionCustomer();
  return NextResponse.json({ customer });
}

/**
 * DELETE /api/auth/session — logout this device. Proxies to Laravel
 * `DELETE /api/v1/auth/session` (revokes the current Sanctum token), then
 * clears the local session cookies regardless of whether the upstream call
 * succeeded — an already-invalid/expired token upstream should never leave
 * the browser stuck with a cookie it can't clear itself.
 * 204 No Content, no body (docs/architecture/08-customer-auth-otp.md §9, §12).
 */
export async function DELETE() {
  const token = await getAuthToken();

  if (token) {
    try {
      await authBackend.logoutSession(token);
    } catch {
      // Best-effort: proceed to clear the local cookie even if the
      // upstream revoke call failed (e.g. network error, already-expired
      // token). The customer's browser must always be able to log out.
    }
  }

  await clearAuthSession();
  return new Response(null, { status: 204 });
}
