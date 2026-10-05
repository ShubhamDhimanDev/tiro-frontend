"use client";

import type { CustomerAddressCreateInput, CustomerAddressListResponse, CustomerAddressResponse, CustomerAddressUpdateInput } from "./types";
import { FRIENDLY_NETWORK_MESSAGE, friendlyMessage } from "@/lib/http/friendly-error";

/**
 * Typed client-side helper for this app's own `/api/customer/addresses*`
 * Route Handlers — mirrors `lib/customer-vehicles/client-api.ts`'s shape,
 * plus one extra result kind: `conflict` (`409`), for the "address is
 * attached to an order/booking, can't hard-delete" case
 * (docs/architecture/02-api-contract.md's "Customer account endpoints"
 * section) — `<SavedAddressesList>` shows the returned message and offers
 * "unset as default" instead of a delete action, per the task brief.
 */
export type CustomerAddressesApiResult<T> =
  | { kind: "success"; status: 200 | 201 | 204; data: T }
  | { kind: "unauthenticated"; status: 401; message: string }
  | { kind: "not_found"; status: 404; message: string }
  | { kind: "conflict"; status: 409; message: string }
  | { kind: "validation_error"; status: 422; message: string; errors: Record<string, string[]> }
  | { kind: "unknown_error"; status: number; message: string };

async function request<T>(path: string, init: RequestInit = {}): Promise<CustomerAddressesApiResult<T>> {
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
    case 204:
      return { kind: "success", status: res.status as 200 | 201 | 204, data: body as T };
    case 401:
      return { kind: "unauthenticated", status: 401, message: body.message ?? "You need to be signed in to do that." };
    case 404:
      return { kind: "not_found", status: 404, message: body.message ?? "Not found." };
    case 409:
      return {
        kind: "conflict",
        status: 409,
        message: body.message ?? "This address is attached to an order and can't be removed.",
      };
    case 422:
      return {
        kind: "validation_error",
        status: 422,
        message: body.message ?? "Please check the form and try again.",
        errors: body.errors ?? {},
      };
    default:
      return { kind: "unknown_error", status: res.status, message: friendlyMessage(res.status, body) };
  }
}

export const customerAddressesApi = {
  list: () => request<CustomerAddressListResponse>("/api/customer/addresses", { method: "GET" }),

  create: (body: CustomerAddressCreateInput) =>
    request<CustomerAddressResponse>("/api/customer/addresses", { method: "POST", body: JSON.stringify(body) }),

  update: (id: number, body: CustomerAddressUpdateInput) =>
    request<CustomerAddressResponse>(`/api/customer/addresses/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  remove: (id: number) => request<Record<string, never>>(`/api/customer/addresses/${id}`, { method: "DELETE" }),

  setDefault: (id: number) => request<CustomerAddressResponse>(`/api/customer/addresses/${id}/set-default`, { method: "POST" }),
};
