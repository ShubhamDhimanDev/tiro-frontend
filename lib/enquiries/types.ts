/**
 * `POST /api/v1/enquiries` (contact, quote, fleet, out-of-area notify-me).
 * Contract: docs/redesign/api-contract-phase6.md section 3.
 */
export const ENQUIRY_TYPES = ["contact", "quote", "fleet", "out_of_area"] as const;
export type EnquiryType = (typeof ENQUIRY_TYPES)[number];

export const REGO_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;
export type RegoState = (typeof REGO_STATES)[number];

/** What the browser sends to this app's `/api/enquiries`. Strings throughout: the form owns parsing. */
export interface EnquiryInput {
  type: EnquiryType | "";
  name: string;
  email: string;
  phone?: string;
  message?: string;
  tyre_size?: string;
  rego?: string;
  rego_state?: string;
  suburb?: string;
  postcode?: string;
  company?: string;
  fleet_size?: string;
  /** Honeypot. Always sent empty by the real form. */
  website?: string;
}

export const ENQUIRY_FIELDS = [
  "type",
  "name",
  "email",
  "phone",
  "message",
  "tyre_size",
  "rego",
  "rego_state",
  "suburb",
  "postcode",
  "company",
  "fleet_size",
  "website",
] as const;
export type EnquiryField = (typeof ENQUIRY_FIELDS)[number];

export type EnquiryErrors = Partial<Record<EnquiryField, string>>;

export interface EnquirySuccessBody {
  data: { reference: string; type: EnquiryType; message: string };
}

export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
  /** Seconds, from `Retry-After` on a 429. */
  retryAfter?: string | null;
}
