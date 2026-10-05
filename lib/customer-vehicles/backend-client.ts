import type { BackendResponse, CustomerVehicleCreateInput, CustomerVehicleUpdateInput } from "./types";

/**
 * Live wiring to Laravel's `/api/v1/customer/vehicles*` — see
 * docs/architecture/02-api-contract.md's "Customer account endpoints"
 * section. Same conventions as `lib/price-guarantee/backend-client.ts`:
 * `auth:customer`-only, no guest fallback, so `token` is a required
 * parameter on every method here, not optional.
 *
 * `LARAVEL_API_URL` defaults to `http://localhost:8000`, matching every
 * other domain's client. Always `cache: "no-store"` — a customer's own
 * saved-vehicle list is per-session and can change any time, never
 * cacheable.
 */

const LARAVEL_API_URL = process.env.LARAVEL_API_URL ?? "http://localhost:8000";
const API_BASE = `${LARAVEL_API_URL}/api/v1`;

async function call(path: string, token: string, init: RequestInit = {}): Promise<BackendResponse<unknown>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
      cache: "no-store",
    });
  } catch {
    return { status: 503, body: { message: "We couldn't reach the server. Please try again shortly." } };
  }

  // `DELETE`/`set-default` on success can be a `204` with no body at all —
  // `res.json()` on an empty body throws, caught the same way a malformed
  // body would be, resolving to `{}` either way.
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export const liveCustomerVehiclesBackend = {
  list: (token: string) => call("/customer/vehicles", token, { method: "GET" }),

  create: (token: string, body: CustomerVehicleCreateInput) =>
    call("/customer/vehicles", token, { method: "POST", body: JSON.stringify(body) }),

  update: (token: string, id: number | string, body: CustomerVehicleUpdateInput) =>
    call(`/customer/vehicles/${encodeURIComponent(String(id))}`, token, { method: "PATCH", body: JSON.stringify(body) }),

  remove: (token: string, id: number | string) =>
    call(`/customer/vehicles/${encodeURIComponent(String(id))}`, token, { method: "DELETE" }),

  setDefault: (token: string, id: number | string) =>
    call(`/customer/vehicles/${encodeURIComponent(String(id))}/set-default`, token, { method: "POST" }),
};

export type CustomerVehiclesBackend = typeof liveCustomerVehiclesBackend;
