import type { BackendResponse } from "./types";

/**
 * Live wiring to `POST /api/v1/enquiries` (public, no auth, no Idempotency-Key).
 * `clientIp` is forwarded as `X-Forwarded-For` so Laravel's per-IP throttle
 * (5/min, 20/h) sees the visitor rather than this server. It is only useful
 * when the backend trusts this proxy; see the report's decisions list.
 *
 * Nothing in here logs a body: enquiries carry names, emails and phone numbers.
 */
const LARAVEL_API_URL = process.env.LARAVEL_API_URL ?? "http://localhost:8000";

async function submit(payload: Record<string, unknown>, opts: { clientIp?: string | null } = {}): Promise<BackendResponse<unknown>> {
  let res: Response;
  try {
    res = await fetch(`${LARAVEL_API_URL}/api/v1/enquiries`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(opts.clientIp ? { "X-Forwarded-For": opts.clientIp } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return { status: 503, body: { message: "We couldn't reach the server. Please try again shortly." } };
  }
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, retryAfter: res.headers.get("Retry-After") };
}

export const liveEnquiriesBackend = { submit };
export type EnquiriesBackend = typeof liveEnquiriesBackend;
