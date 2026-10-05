import type { BackendResponse, CartCalculateInput } from "./types";

/**
 * Live wiring to Laravel's `POST /api/v1/cart/calculate` — see
 * docs/architecture/02-api-contract.md's "Cart, Checkout & Payment
 * endpoints" section. Same conventions as `lib/booking/backend-client.ts`.
 *
 * `LARAVEL_API_URL` defaults to `http://localhost:8000`, matching
 * `backend/.env`'s `APP_URL` for local dev.
 *
 * Always `cache: "no-store"` — a pricing preview is never cacheable (price/
 * stock/promo state can change between calls, and this is explicitly a
 * "stateless pricing preview... safe to call on every cart change" per the
 * contract, not something to memoize).
 */

const LARAVEL_API_URL = process.env.LARAVEL_API_URL ?? "http://localhost:8000";
const API_BASE = `${LARAVEL_API_URL}/api/v1`;

/**
 * Mode 2 (`{ booking_id }`) reuses the exact same auth as Phase 3's booking
 * mutation endpoints — authenticated owner or `X-Booking-Manage-Token` — so
 * this accepts the same `{ token, manageToken }` opts shape as
 * `lib/booking/backend-client.ts`'s `authHeaders()`. Mode 1 (`{ zone_id,
 * items }`) requires no auth; callers simply pass `{}`.
 */
function authHeaders(opts: { token?: string | null; manageToken?: string | null }): Record<string, string> {
  if (opts.token) return { Authorization: `Bearer ${opts.token}` };
  if (opts.manageToken) return { "X-Booking-Manage-Token": opts.manageToken };
  return {};
}

async function calculate(
  input: CartCalculateInput,
  opts: { token?: string | null; manageToken?: string | null } = {}
): Promise<BackendResponse<unknown>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/cart/calculate`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...authHeaders(opts),
      },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    return { status: 503, body: { message: "We couldn't reach the server. Please try again shortly." } };
  }

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export const liveCartBackend = { calculate };
export type CartBackend = typeof liveCartBackend;
