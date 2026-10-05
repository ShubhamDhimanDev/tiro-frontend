"use client";

import type { EnquiryErrors, EnquiryInput, EnquirySuccessBody } from "./types";
import { ENQUIRY_FIELDS } from "./types";

/**
 * Browser helper for this app's own `/api/enquiries` handler. The response
 * never echoes the submitted fields, so nothing personal is kept here beyond
 * the request itself, and nothing goes in a URL or a log.
 */
export type EnquiryResult =
  | { kind: "success"; reference: string; message: string }
  | { kind: "validation_error"; message: string; errors: EnquiryErrors }
  | { kind: "throttled"; message: string; retryAfter: number | null }
  | { kind: "error"; message: string };

export const THROTTLE_MESSAGE = "Too many messages, try again in a minute.";

export async function submitEnquiry(input: EnquiryInput): Promise<EnquiryResult> {
  let res: Response;
  try {
    res = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    return { kind: "error", message: "We couldn't send that. Check your connection and try again, or call us." };
  }

  const body = await res.json().catch(() => ({}));

  if (res.status === 201 || res.status === 200) {
    const data = (body as EnquirySuccessBody).data;
    if (data?.reference) return { kind: "success", reference: data.reference, message: data.message };
    return { kind: "error", message: "Something went wrong. Please try again." };
  }
  if (res.status === 429) {
    const retry = Number(res.headers.get("Retry-After"));
    return { kind: "throttled", message: THROTTLE_MESSAGE, retryAfter: Number.isFinite(retry) && retry > 0 ? retry : null };
  }
  if (res.status === 422) {
    const raw = (body as { errors?: Record<string, string[]>; message?: string }).errors ?? {};
    const errors: EnquiryErrors = {};
    for (const field of ENQUIRY_FIELDS) {
      const first = raw[field]?.[0];
      if (first) errors[field] = first;
    }
    return {
      kind: "validation_error",
      message: (body as { message?: string }).message ?? "Please check the highlighted fields.",
      errors,
    };
  }
  return { kind: "error", message: "Something went wrong on our side. Please try again, or call us." };
}
