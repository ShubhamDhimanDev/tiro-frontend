import type { BackendResponse, CustomerAddressCreateInput, CustomerAddressUpdateInput } from "./types";

/**
 * Live wiring to Laravel's `/api/v1/customer/addresses*` — see
 * docs/architecture/02-api-contract.md's "Customer account endpoints"
 * section. Same conventions as `lib/customer-vehicles/backend-client.ts`:
 * `auth:customer`-only, `token` required on every method.
 *
 * `LARAVEL_API_URL` defaults to `http://localhost:8000`. Always
 * `cache: "no-store"` — per-session, mutable data.
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

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export const liveCustomerAddressesBackend = {
  list: (token: string) => call("/customer/addresses", token, { method: "GET" }),

  create: (token: string, body: CustomerAddressCreateInput) =>
    call("/customer/addresses", token, { method: "POST", body: JSON.stringify(body) }),

  update: (token: string, id: number | string, body: CustomerAddressUpdateInput) =>
    call(`/customer/addresses/${encodeURIComponent(String(id))}`, token, { method: "PATCH", body: JSON.stringify(body) }),

  /** Can `409` if the address is still referenced by an `Order`/`Booking` — passed through as-is, same "let the server's own validation say so" posture the rest of this app follows; see `client-api.ts`'s `conflict` result kind. */
  remove: (token: string, id: number | string) =>
    call(`/customer/addresses/${encodeURIComponent(String(id))}`, token, { method: "DELETE" }),

  setDefault: (token: string, id: number | string) =>
    call(`/customer/addresses/${encodeURIComponent(String(id))}/set-default`, token, { method: "POST" }),
};

export type CustomerAddressesBackend = typeof liveCustomerAddressesBackend;
