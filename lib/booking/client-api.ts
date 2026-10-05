"use client";

import type {
  BookingAddonKey,
  BookingCreateInput,
  BookingCreateResponse,
  BookingItemInput,
  BookingRescheduleInput,
  BookingResponse,
  BookingSlotsResponse,
} from "./types";
import { FRIENDLY_NETWORK_MESSAGE, friendlyMessage } from "@/lib/http/friendly-error";

/**
 * Typed client-side helper for this app's own `/api/booking/*` Route
 * Handlers — mirrors `lib/vehicles/client-api.ts` / `lib/location/client-api.ts`'s
 * shape so every consumer handles success/failure the same way instead of
 * re-deriving it from a raw `Response`. The browser never calls Laravel
 * directly for booking data, same posture as every other domain in this app.
 */

export type BookingApiResult<T> =
  | { kind: "success"; status: 200 | 201; data: T }
  | { kind: "not_found"; status: 404; message: string }
  | { kind: "validation_error"; status: 422; message: string; errors: Record<string, string[]> }
  | { kind: "conflict"; status: 409; message: string }
  | { kind: "forbidden"; status: 403; message: string }
  | { kind: "unknown_error"; status: number; message: string };

async function request<T>(path: string, init: RequestInit = {}): Promise<BookingApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", Accept: "application/json", ...init.headers },
      cache: "no-store",
    });
  } catch {
    return { kind: "unknown_error", status: 0, message: FRIENDLY_NETWORK_MESSAGE };
  }

  const body = await res.json().catch(() => ({}));

  switch (res.status) {
    case 200:
    case 201:
      return { kind: "success", status: res.status as 200 | 201, data: body as T };
    case 403:
      return { kind: "forbidden", status: 403, message: body.message ?? "You don't have permission to manage this booking." };
    case 404:
      return { kind: "not_found", status: 404, message: body.message ?? "Not found." };
    case 409:
      return { kind: "conflict", status: 409, message: body.message ?? "This slot is no longer available, please choose another." };
    case 422:
      return {
        kind: "validation_error",
        status: 422,
        message: body.message ?? "Please check your booking details and try again.",
        errors: body.errors ?? {},
      };
    default:
      // A server fault (5xx) can carry an internal message (stack traces, provider errors): never show it to a customer.
      return {
        kind: "unknown_error",
        status: res.status,
        message: friendlyMessage(res.status, body),
      };
  }
}

export const bookingApi = {
  slots: (params: { zone: string; dateFrom: string; dateTo: string; items: BookingItemInput[]; addons: BookingAddonKey[] }) => {
    const qs = new URLSearchParams({
      zone: params.zone,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      items: JSON.stringify(params.items),
      addons: JSON.stringify(params.addons),
    });
    return request<BookingSlotsResponse>(`/api/booking/slots?${qs.toString()}`, { method: "GET" });
  },

  /** `idempotencyKey` is generated once per checkout attempt by the caller (`components/booking/booking-flow.tsx`) and reused across retries of that same attempt. */
  create: (body: BookingCreateInput, idempotencyKey: string) =>
    request<BookingCreateResponse>("/api/booking", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Idempotency-Key": idempotencyKey },
    }),

  reschedule: (bookingId: number, body: BookingRescheduleInput) =>
    request<BookingResponse>(`/api/booking/${bookingId}/reschedule`, { method: "PATCH", body: JSON.stringify(body) }),

  cancel: (bookingId: number) => request<BookingResponse>(`/api/booking/${bookingId}/cancel`, { method: "POST" }),

  /**
   * `GET /api/booking/{id}` (added 2026-09-21) — read-only current state.
   * `components/booking/booking-flow.tsx` calls this on load/reload so a
   * cached `sessionStorage` record is never the only source of truth for
   * "is this hold still valid" — see that file's doc comment.
   */
  show: (bookingId: number) => request<BookingResponse>(`/api/booking/${bookingId}`, { method: "GET" }),
};
