"use client";

import type { OrderCreateInput, OrderCreateResponse, OrderResponse } from "./types";
import { FRIENDLY_NETWORK_MESSAGE, friendlyMessage } from "@/lib/http/friendly-error";

/**
 * Typed client-side helper for this app's own `/api/orders/*` Route
 * Handlers — mirrors `lib/booking/client-api.ts`'s shape. The browser never
 * calls Laravel directly (same reasoning as every other guest-token domain
 * in this app: only a server-side Route Handler can read the httpOnly
 * manage-token/order-token cookies to attach the right header).
 */

export type OrdersApiResult<T> =
  | { kind: "success"; status: 200 | 201; data: T }
  | { kind: "not_found"; status: 404; message: string }
  | { kind: "validation_error"; status: 422; message: string; errors: Record<string, string[]> }
  | { kind: "conflict"; status: 409; message: string }
  | { kind: "forbidden"; status: 403; message: string }
  | { kind: "unknown_error"; status: number; message: string };

async function request<T>(path: string, init: RequestInit = {}): Promise<OrdersApiResult<T>> {
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
      return { kind: "forbidden", status: 403, message: body.message ?? "You don't have permission to view this order." };
    case 404:
      return { kind: "not_found", status: 404, message: body.message ?? "Not found." };
    case 409:
      return { kind: "conflict", status: 409, message: body.message ?? "This booking hold has expired, please choose another appointment." };
    case 422:
      return {
        kind: "validation_error",
        status: 422,
        message: body.message ?? "Please check your details and try again.",
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

export const ordersApi = {
  /** `idempotencyKey` is generated once per checkout submission-intent by the caller (`components/checkout/checkout-flow.tsx`) and reused across retries of that same attempt — never regenerated per click/retry. */
  create: (body: OrderCreateInput, idempotencyKey: string) =>
    request<OrderCreateResponse>("/api/orders", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Idempotency-Key": idempotencyKey },
    }),

  show: (orderId: number) => request<OrderResponse>(`/api/orders/${orderId}`, { method: "GET" }),

  /**
   * PayPal only — proxies `POST /api/v1/orders/{order}/paypal-capture`.
   * Called from `components/checkout/paypal-payment-step.tsx`'s `onApprove`
   * callback, synchronously, before treating the payment as confirmed (see
   * that component's doc comment for why this can't be a client-side-only
   * confirmation the way Stripe's `confirmPayment()` is). `idempotencyKey`
   * is generated once per payment attempt by the caller, same "generate
   * once, reuse across retries of that same attempt" discipline as
   * `create()` above.
   */
  paypalCapture: (orderId: number, idempotencyKey: string) =>
    request<OrderResponse>(`/api/orders/${orderId}/paypal-capture`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
    }),
};
