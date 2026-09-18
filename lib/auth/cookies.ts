import { cookies } from "next/headers";
import type { PublicCustomer } from "./types";

/**
 * Server-side session cookies for the customer auth boundary.
 *
 * Hard security requirement (root brief + docs/architecture/02-api-contract.md
 * "Auth model" + 08-customer-auth-otp.md §9): the Sanctum bearer token is
 * held **only** in an httpOnly, secure cookie scoped to frontend's own
 * domain. It is never readable by client JS, never echoed back in a JSON
 * response body, and never forwarded anywhere except as the `Authorization`
 * header on our own server-to-Laravel calls.
 *
 * A second cookie holds a small, non-authoritative snapshot of the
 * `PublicCustomer` the token belongs to. This is a frontend-only
 * implementation detail (08-customer-auth-otp.md §9 explicitly scopes Route
 * Handler internals as out-of-cross-repo-contract) that exists so a Server
 * Component (root layout, account pages) can hydrate "who's signed in" on
 * every page load without a round trip to Laravel just to render a name in
 * a header — Laravel remains the source of truth for anything that matters
 * (orders, balances, the token's own validity). It is also httpOnly: it is
 * only ever read server-side and passed down as props/context, never via
 * `document.cookie`, so making it httpOnly is strictly more defensive with
 * no functionality cost.
 */

export const AUTH_TOKEN_COOKIE = "mts_customer_token";
export const AUTH_CUSTOMER_COOKIE = "mts_customer";

/** Matches the token's own recommended sliding 90-day idle-expiry (§9). "Stay signed in" is the default, not opt-in. */
const NINETY_DAYS_IN_SECONDS = 60 * 60 * 24 * 90;

function baseCookieOptions() {
  return {
    httpOnly: true,
    // Secure is forced in production. Relaxed in non-production so local
    // dev over plain http (no TLS terminator in front of `next dev`)
    // doesn't silently drop the cookie — devops-agent's Docker Compose /
    // Nginx topology is what actually terminates TLS in any real
    // environment, at which point this is always true.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: NINETY_DAYS_IN_SECONDS,
  };
}

export interface SessionCookiePayload {
  token: string;
  customer: PublicCustomer;
}

/** Sets both session cookies together. Call this on every token-issuing response. */
export async function setAuthSession({ token, customer }: SessionCookiePayload): Promise<void> {
  const store = await cookies();
  const options = baseCookieOptions();
  store.set(AUTH_TOKEN_COOKIE, token, options);
  store.set(AUTH_CUSTOMER_COOKIE, JSON.stringify(customer), options);
}

/** Clears both session cookies. Call this on logout (single-device or everywhere) regardless of whether the upstream Laravel revoke call succeeded. */
export async function clearAuthSession(): Promise<void> {
  const store = await cookies();
  store.delete(AUTH_TOKEN_COOKIE);
  store.delete(AUTH_CUSTOMER_COOKIE);
}

/** Server-only: the raw bearer token, for attaching `Authorization` on outbound Laravel calls. Never send this to the client. */
export async function getAuthToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(AUTH_TOKEN_COOKIE)?.value ?? null;
}

/** Server Component-safe: the signed-in customer snapshot, or null if no session cookie is present. */
export async function getSessionCustomer(): Promise<PublicCustomer | null> {
  const store = await cookies();
  const raw = store.get(AUTH_CUSTOMER_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicCustomer;
  } catch {
    return null;
  }
}
