/**
 * Live wiring to `POST /api/v1/newsletter-subscriptions` (Phase 7 contract
 * section 6). Public, no auth. The visitor IP is forwarded as
 * `X-Forwarded-For` so Laravel's per-IP throttle sees the visitor. Nothing in
 * here logs a body: it carries an email address.
 */
const LARAVEL_API_URL = process.env.LARAVEL_API_URL ?? "http://localhost:8000";

export type NewsletterBackendResponse = { status: number; body: unknown; retryAfter?: string | null };

export async function subscribe(payload: Record<string, unknown>, opts: { clientIp?: string | null } = {}): Promise<NewsletterBackendResponse> {
  let res: Response;
  try {
    res = await fetch(`${LARAVEL_API_URL}/api/v1/newsletter-subscriptions`, {
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

export const liveNewsletterBackend = { subscribe };
