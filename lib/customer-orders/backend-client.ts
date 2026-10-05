import type { BackendResponse } from "./types";

/**
 * Live wiring to Laravel's `GET /api/v1/customer/orders` — see
 * docs/architecture/02-api-contract.md's "Customer account endpoints"
 * section. Same conventions as `lib/customer-vehicles/backend-client.ts`:
 * `auth:customer`-only, `token` required.
 *
 * `LARAVEL_API_URL` defaults to `http://localhost:8000`. Always
 * `cache: "no-store"` — order history can change (a new order placed, a
 * status update) and must never be served stale from this app's own fetch
 * cache.
 */

const LARAVEL_API_URL = process.env.LARAVEL_API_URL ?? "http://localhost:8000";
const API_BASE = `${LARAVEL_API_URL}/api/v1`;

export const liveCustomerOrdersBackend = {
  list: async (token: string, page?: number): Promise<BackendResponse<unknown>> => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/customer/orders${page ? `?page=${page}` : ""}`, {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    } catch {
      return { status: 503, body: { message: "We couldn't reach the server. Please try again shortly." } };
    }

    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  },
};

export type CustomerOrdersBackend = typeof liveCustomerOrdersBackend;
