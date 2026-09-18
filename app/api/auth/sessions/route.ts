import { getAuthToken, clearAuthSession } from "@/lib/auth/cookies";
import { authBackend } from "@/lib/auth/backend";

/**
 * DELETE /api/auth/sessions — logout everywhere (all devices). Proxies to
 * Laravel `DELETE /api/v1/auth/sessions`, which revokes every one of the
 * customer's Sanctum tokens, not just the current one. Also clears this
 * device's cookies, since this device is included in "everywhere".
 * Surfaced as an account-settings action, not the primary logout button
 * (docs/architecture/08-customer-auth-otp.md §9).
 * 204 No Content, no body.
 */
export async function DELETE() {
  const token = await getAuthToken();

  if (token) {
    try {
      await authBackend.logoutAllSessions(token);
    } catch {
      // Best-effort, same reasoning as /api/auth/session.
    }
  }

  await clearAuthSession();
  return new Response(null, { status: 204 });
}
