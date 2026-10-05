import type { BackendResponse, PriceGuaranteeClaimCreateInput } from "./types";

/**
 * Live wiring to Laravel's `POST /api/v1/price-guarantee-claims` /
 * `GET /api/v1/price-guarantee-claims` — see
 * docs/architecture/02-api-contract.md's "Promotions & Price-Guarantee
 * endpoints" section. Same conventions as `lib/cart/backend-client.ts`.
 *
 * `LARAVEL_API_URL` defaults to `http://localhost:8000`, matching
 * `backend/.env`'s `APP_URL` for local dev. Always `cache: "no-store"` —
 * claim state is per-customer and can change (admin review), never
 * cacheable.
 *
 * Both methods require a bearer token — there is no guest/manage-token
 * fallback on this domain (see `types.ts`'s doc comment) — so `token` is a
 * required, not optional, parameter here, unlike every other backend-client
 * in this app.
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

export const livePriceGuaranteeBackend = {
  create: (token: string, body: PriceGuaranteeClaimCreateInput) =>
    call("/price-guarantee-claims", token, { method: "POST", body: JSON.stringify(body) }),

  list: (token: string, page?: number) =>
    call(`/price-guarantee-claims${page ? `?page=${page}` : ""}`, token, { method: "GET" }),
};

export type PriceGuaranteeBackend = typeof livePriceGuaranteeBackend;
