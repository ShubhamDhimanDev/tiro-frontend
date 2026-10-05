"use client";

import type { CartCalculateData, CartCalculateItemsInput } from "./types";
import { FRIENDLY_NETWORK_MESSAGE, friendlyMessage } from "@/lib/http/friendly-error";

/**
 * Typed client-side helper for this app's own `/api/cart/calculate` Route
 * Handler — mirrors `lib/booking/client-api.ts`'s shape. The browser never
 * calls Laravel directly (mode 2 needs the guest `X-Booking-Manage-Token`
 * attached server-side from the httpOnly cookie, same reason every other
 * authenticated-or-guest domain in this app is proxied).
 */

export type CartApiResult<T> =
  | { kind: "success"; status: 200; data: T }
  | { kind: "not_found"; status: 404; message: string }
  | { kind: "validation_error"; status: 422; message: string; errors: Record<string, string[]> }
  | { kind: "forbidden"; status: 403; message: string }
  | { kind: "unknown_error"; status: number; message: string };

async function request<T>(body: unknown): Promise<CartApiResult<T>> {
  let res: Response;
  try {
    res = await fetch("/api/cart/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { kind: "unknown_error", status: 0, message: FRIENDLY_NETWORK_MESSAGE };
  }

  const responseBody = await res.json().catch(() => ({}));

  switch (res.status) {
    case 200:
      return { kind: "success", status: 200, data: responseBody as T };
    case 403:
      return { kind: "forbidden", status: 403, message: responseBody.message ?? "You don't have permission to view this order summary." };
    case 404:
      return { kind: "not_found", status: 404, message: responseBody.message ?? "Not found." };
    case 422:
      return {
        kind: "validation_error",
        status: 422,
        message: responseBody.message ?? "Please check your cart and try again.",
        errors: responseBody.errors ?? {},
      };
    default:
      // A server fault (5xx) can carry an internal message (stack traces, provider errors): never show it to a customer.
      return {
        kind: "unknown_error",
        status: res.status,
        message: friendlyMessage(res.status, responseBody),
      };
  }
}

export const cartApi = {
  /** Mode 1 — cart page pricing preview, before a booking exists. No auth needed. */
  calculateItems: (zoneId: string, items: CartCalculateItemsInput[], opts: { promoCode?: string | null; flexible?: boolean } = {}) =>
    request<{ data: CartCalculateData }>({
      zone_id: zoneId,
      items,
      ...(opts.promoCode ? { promo_code: opts.promoCode } : {}),
      ...(opts.flexible ? { flexible: true } : {}),
    }),

  /** Mode 2 — checkout page, authoritative breakdown against an already-created booking hold. */
  calculateBooking: (bookingId: number) => request<{ data: CartCalculateData }>({ booking_id: bookingId }),
};
