"use client";

import type {
  PriceGuaranteeClaimCreateInput,
  PriceGuaranteeClaimCreateResponse,
  PriceGuaranteeClaimListResponse,
} from "./types";
import { FRIENDLY_NETWORK_MESSAGE, friendlyMessage } from "@/lib/http/friendly-error";

/**
 * Typed client-side helper for this app's own `/api/price-guarantee-claims`
 * Route Handler — mirrors `lib/cart/client-api.ts`'s shape. The browser
 * never calls Laravel directly (only a server-side Route Handler can read
 * the httpOnly session cookie to attach the customer's bearer token — same
 * reasoning as every other authenticated domain in this app).
 *
 * `unauthenticated` is this domain's own result kind, distinct from every
 * other domain's `forbidden` — there is no guest/manage-token fallback here
 * at all (see `types.ts`'s doc comment), so "no session" is a hard 401, not
 * a "wrong credential for this specific resource" 403. Callers (the claim
 * form, the claims list) treat it as "send this customer to log in," not as
 * a generic error.
 */

export type PriceGuaranteeApiResult<T> =
  | { kind: "success"; status: 200 | 201; data: T }
  | { kind: "unauthenticated"; status: 401; message: string }
  | { kind: "forbidden"; status: 403; message: string }
  | { kind: "validation_error"; status: 422; message: string; errors: Record<string, string[]> }
  | { kind: "unknown_error"; status: number; message: string };

async function request<T>(path: string, init: RequestInit = {}): Promise<PriceGuaranteeApiResult<T>> {
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
    case 401:
      return { kind: "unauthenticated", status: 401, message: body.message ?? "You need to be signed in to do that." };
    case 403:
      return { kind: "forbidden", status: 403, message: body.message ?? "You don't have permission to do that." };
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

export const priceGuaranteeApi = {
  create: (body: PriceGuaranteeClaimCreateInput) =>
    request<PriceGuaranteeClaimCreateResponse>("/api/price-guarantee-claims", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  list: (page?: number) =>
    request<PriceGuaranteeClaimListResponse>(`/api/price-guarantee-claims${page ? `?page=${page}` : ""}`, {
      method: "GET",
    }),
};
