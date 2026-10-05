import { validateEnquiry } from "./validate";
import type { EnquiriesBackend } from "./backend-client";
import type { EnquiryInput } from "./types";

/**
 * In-memory stub for `POST /api/v1/enquiries`, opt-in via `ENQUIRIES_BACKEND=stub`.
 * Validates with the same rules, answers a filled honeypot like a success, and
 * throttles at 5 per minute so the 429 state can be exercised in stub mode.
 * Nothing is stored or logged.
 */
const hits: number[] = [];

function randomReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "ENQ-";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export const stubEnquiriesBackend: EnquiriesBackend = {
  async submit(payload: Record<string, unknown>) {
    const now = Date.now();
    while (hits.length > 0 && now - hits[0] > 60_000) hits.shift();
    hits.push(now);
    if (hits.length > 5) return { status: 429, body: { message: "Too Many Attempts." }, retryAfter: "60" };

    const input = Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)]),
    ) as unknown as EnquiryInput;
    const errors = validateEnquiry(input);
    if (Object.keys(errors).length > 0) {
      const messages = Object.values(errors);
      return {
        status: 422,
        body: {
          message: messages.length > 1 ? `${messages[0]} (and ${messages.length - 1} more errors)` : messages[0],
          errors: Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, [v]])),
        },
      };
    }
    const type = String(payload.type);
    return {
      status: 201,
      body: { data: { reference: randomReference(), type, message: "Thanks, we've got your message. We'll be in touch soon." } },
    };
  },
};
