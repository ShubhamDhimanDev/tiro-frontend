import type { BackendResponse } from "./types";

/**
 * Live wiring to Laravel's `GET /api/v1/social-proof/recent-orders`: public,
 * no auth. The backend caches for about 60 s; this app's Route Handler adds a
 * short shared-cache header on top. Never throws: an unreachable backend is a 503.
 */
const LARAVEL_API_URL = process.env.LARAVEL_API_URL ?? "http://localhost:8000";
const API_BASE = `${LARAVEL_API_URL}/api/v1`;

async function recentOrders(): Promise<BackendResponse<unknown>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/social-proof/recent-orders`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { status: 503, body: { message: "We couldn't reach the server. Please try again shortly." } };
  }
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export const liveSocialProofBackend = { recentOrders };

export type SocialProofBackend = typeof liveSocialProofBackend;
