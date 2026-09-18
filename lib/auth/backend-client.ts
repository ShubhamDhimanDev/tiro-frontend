import type { BackendResponse } from "./types";

/**
 * Live wiring to Laravel's `/api/v1/auth/*` endpoints — see
 * `backend/routes/api.php` for the authoritative route list and
 * docs/architecture/08-customer-auth-otp.md §12 for response shapes/status
 * codes. backend-agent shipped all 9 routes; this is the default
 * `authBackend` implementation (see `backend.ts`) unless `AUTH_BACKEND=stub`
 * is set explicitly.
 *
 * `LARAVEL_API_URL` defaults to `http://localhost:8000`, matching
 * `backend/.env`'s `APP_URL` for local dev — override it for staging/prod.
 */

const LARAVEL_API_URL = process.env.LARAVEL_API_URL ?? "http://localhost:8000";
const AUTH_BASE = `${LARAVEL_API_URL}/api/v1/auth`;

async function call(path: string, init: RequestInit): Promise<BackendResponse> {
  let res: Response;
  try {
    res = await fetch(`${AUTH_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...init.headers,
      },
      cache: "no-store",
    });
  } catch {
    // Laravel unreachable (down, DNS, connection refused, etc). Surface the
    // app's own `{message}` shape rather than letting the Route Handler
    // throw and fall back to Next's generic (non-JSON) 500 error page —
    // every caller of `authBackend` already knows how to render a generic
    // failure message from this shape.
    return {
      status: 503,
      body: { message: "We couldn't reach the server. Please try again shortly." },
    };
  }

  if (res.status === 204) {
    return { status: 204, body: null };
  }

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export const liveAuthBackend = {
  register: (email: string, password: string) =>
    call("/register", { method: "POST", body: JSON.stringify({ email, password }) }),

  registerVerify: (email: string, code: string) =>
    call("/register/verify", { method: "POST", body: JSON.stringify({ email, code }) }),

  login: (email: string, password: string) =>
    call("/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  otpRequest: (email: string) =>
    call("/otp/request", { method: "POST", body: JSON.stringify({ email }) }),

  otpVerify: (email: string, code: string) =>
    call("/otp/verify", { method: "POST", body: JSON.stringify({ email, code }) }),

  passwordResetRequest: (email: string) =>
    call("/password/reset/request", { method: "POST", body: JSON.stringify({ email }) }),

  passwordResetVerify: (email: string, code: string, newPassword: string) =>
    call("/password/reset/verify", {
      method: "POST",
      body: JSON.stringify({ email, code, new_password: newPassword }),
    }),

  logoutSession: (token: string) =>
    call("/session", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }),

  logoutAllSessions: (token: string) =>
    call("/sessions", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }),
};

export type AuthBackend = typeof liveAuthBackend;
