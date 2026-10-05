import type {
  BackendResponse,
  BookingAddonKey,
  BookingCreateInput,
  BookingItemInput,
  BookingRescheduleInput,
} from "./types";

/**
 * Live wiring to Laravel's `/api/v1/booking-slots` and `/api/v1/bookings*`
 * endpoints — see docs/architecture/02-api-contract.md's "Booking &
 * capacity endpoints" section. Same conventions as
 * `lib/vehicles/backend-client.ts` / `lib/catalog/backend-client.ts`.
 *
 * `LARAVEL_API_URL` defaults to `http://localhost:8000`, matching
 * `backend/.env`'s `APP_URL` for local dev.
 *
 * Every call here is `cache: "no-store"` — booking slots/holds are
 * capacity- and time-dependent, never cacheable, same posture as the PDP
 * availability fetch.
 */

const LARAVEL_API_URL = process.env.LARAVEL_API_URL ?? "http://localhost:8000";
const API_BASE = `${LARAVEL_API_URL}/api/v1`;

async function call(path: string, init: RequestInit = {}): Promise<BackendResponse<unknown>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
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

/**
 * `booking-slots` is a `GET` with array-shaped `items[]`/`addons[]` query
 * params — Laravel reads these the same bracket-notation way regardless of
 * HTTP verb, so this mirrors `StoreBookingRequest`'s JSON-body shape as a
 * query string instead.
 */
function appendCartParams(params: URLSearchParams, items: BookingItemInput[], addons: BookingAddonKey[]): void {
  items.forEach((item, index) => {
    params.append(`items[${index}][tyre_variant_id]`, String(item.tyre_variant_id));
    params.append(`items[${index}][quantity]`, String(item.quantity));
    params.append(`items[${index}][position]`, item.position);
  });
  addons.forEach((addon) => params.append("addons[]", addon));
}

function authHeaders(opts: { token?: string | null; manageToken?: string | null }): Record<string, string> {
  // Mirrors `BookingController::authorizeGuestOrOwner()`'s precedence
  // exactly: an authenticated bearer token is checked first (and, if
  // present, is the *only* thing sent — the backend doesn't fall back to a
  // manage token for a logged-in customer either), a manage token only
  // applies when there's no bearer token at all.
  if (opts.token) return { Authorization: `Bearer ${opts.token}` };
  if (opts.manageToken) return { "X-Booking-Manage-Token": opts.manageToken };
  return {};
}

export const liveBookingBackend = {
  slots: (zone: string, dateFrom: string, dateTo: string, items: BookingItemInput[], addons: BookingAddonKey[]) => {
    const params = new URLSearchParams({ zone, date_from: dateFrom, date_to: dateTo });
    appendCartParams(params, items, addons);
    return call(`/booking-slots?${params.toString()}`, { method: "GET" });
  },

  create: (body: BookingCreateInput, opts: { idempotencyKey: string; token?: string | null }) =>
    call("/bookings", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Idempotency-Key": opts.idempotencyKey,
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
    }),

  reschedule: (
    bookingId: number | string,
    body: BookingRescheduleInput,
    opts: { token?: string | null; manageToken?: string | null }
  ) =>
    call(`/bookings/${encodeURIComponent(String(bookingId))}/reschedule`, {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: authHeaders(opts),
    }),

  cancel: (bookingId: number | string, opts: { token?: string | null; manageToken?: string | null }) =>
    call(`/bookings/${encodeURIComponent(String(bookingId))}/cancel`, {
      method: "POST",
      headers: authHeaders(opts),
    }),

  /**
   * `GET /api/v1/bookings/{booking}` (added 2026-09-21) — read-only current
   * state, no side effects. Same dual auth as `reschedule`/`cancel`. Added
   * so a manage/status view can reflect authoritative state on load/reload
   * instead of only ever trusting a cached mutation response — see
   * `components/booking/booking-flow.tsx`'s doc comment.
   */
  show: (bookingId: number | string, opts: { token?: string | null; manageToken?: string | null }) =>
    call(`/bookings/${encodeURIComponent(String(bookingId))}`, {
      method: "GET",
      headers: authHeaders(opts),
    }),
};

export type BookingBackend = typeof liveBookingBackend;
