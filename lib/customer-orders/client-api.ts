"use client";

import type { CustomerOrderListResponse } from "./types";
import { FRIENDLY_NETWORK_MESSAGE, friendlyMessage } from "@/lib/http/friendly-error";

/**
 * Typed client-side helper for this app's own `/api/customer/orders` Route
 * Handler — mirrors `lib/price-guarantee/client-api.ts`'s shape (no
 * guest/manage-token fallback, `unauthenticated` not `forbidden` for "no
 * session").
 */
export type CustomerOrdersApiResult<T> =
  | { kind: "success"; status: 200; data: T }
  | { kind: "unauthenticated"; status: 401; message: string }
  | { kind: "unknown_error"; status: number; message: string };

async function request<T>(path: string): Promise<CustomerOrdersApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, { headers: { Accept: "application/json" }, cache: "no-store" });
  } catch {
    return { kind: "unknown_error", status: 0, message: FRIENDLY_NETWORK_MESSAGE };
  }

  const body = await res.json().catch(() => ({}));

  if (res.status === 200) {
    return { kind: "success", status: 200, data: body as T };
  }
  if (res.status === 401) {
    return { kind: "unauthenticated", status: 401, message: body.message ?? "You need to be signed in to view your orders." };
  }
  return { kind: "unknown_error", status: res.status, message: friendlyMessage(res.status, body) };
}

export const customerOrdersApi = {
  list: (page?: number) => request<CustomerOrderListResponse>(`/api/customer/orders${page ? `?page=${page}` : ""}`),
};
