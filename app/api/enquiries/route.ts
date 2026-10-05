import { NextResponse } from "next/server";
import { enquiriesBackend } from "@/lib/enquiries/backend";
import { ENQUIRY_FIELDS, type EnquiryInput } from "@/lib/enquiries/types";
import { toEnquiryPayload, validateEnquiry } from "@/lib/enquiries/validate";

/**
 * POST /api/enquiries proxies `POST /api/v1/enquiries` (contact, quote, fleet,
 * out-of-area notify-me).
 *
 * - Only known string fields are read; anything else in the body is dropped.
 * - The same validation the forms run is applied here first, so a direct call
 *   gets the same messages without a round trip to Laravel (Laravel still
 *   validates, and stays the source of truth).
 * - The honeypot `website` is forwarded untouched: the API answers a filled one
 *   like a success and stores nothing.
 * - 429 keeps its `Retry-After`. The visitor's IP is forwarded so the API's
 *   per-IP throttle sees the visitor, not this server.
 * - Personal details are never logged and never echoed back.
 */
export async function POST(request: Request) {
  const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ message: "Please check your details and try again.", errors: {} }, { status: 422 });
  }

  const input: Record<string, string> = {};
  for (const field of ENQUIRY_FIELDS) {
    const value = raw[field];
    if (typeof value === "string") input[field] = value;
    else if (typeof value === "number") input[field] = String(value);
  }
  const enquiry = input as unknown as EnquiryInput;

  // A filled honeypot skips validation so a bot gets no signal about which rule it tripped.
  if (!enquiry.website) {
    const errors = validateEnquiry(enquiry);
    const messages = Object.values(errors);
    if (messages.length > 0) {
      return NextResponse.json(
        {
          message: messages.length > 1 ? `${messages[0]} (and ${messages.length - 1} more errors)` : messages[0],
          errors: Object.fromEntries(Object.entries(errors).map(([field, message]) => [field, [message]])),
        },
        { status: 422 },
      );
    }
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const clientIp = forwarded ? forwarded.split(",")[0].trim() : null;

  const result = await enquiriesBackend.submit(toEnquiryPayload(enquiry), { clientIp });

  const response = NextResponse.json(result.body, { status: result.status });
  if (result.status === 429 && result.retryAfter) response.headers.set("Retry-After", result.retryAfter);
  return response;
}
