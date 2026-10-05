import { ENQUIRY_FIELDS, ENQUIRY_TYPES, REGO_STATES, type EnquiryErrors, type EnquiryInput } from "./types";

/**
 * Client and server validation for enquiries. It mirrors the Laravel rules in
 * docs/redesign/api-contract-phase6.md section 3 (the API stays the source of
 * truth; this only saves a round trip and keeps the same wording). Used by the
 * forms and by the `/api/enquiries` route handler.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARS = /^[0-9+()\-\s]+$/;
const REGO = /^[A-Za-z0-9]+$/;
const POSTCODE = /^\d{4}$/;
const INTEGER = /^\d+$/;

/** Spaces and dashes are stripped from a plate before it is sent (the API does the same). */
export function normaliseRego(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

const s = (v: string | undefined) => (v ?? "").trim();

export function validateEnquiry(input: EnquiryInput): EnquiryErrors {
  const errors: EnquiryErrors = {};
  const type = input.type;

  if (!type || !(ENQUIRY_TYPES as readonly string[]).includes(type)) {
    errors.type = "Please choose what your enquiry is about.";
  }

  const name = s(input.name);
  if (!name) errors.name = "Please tell us your name.";
  else if (name.length > 120) errors.name = "Your name needs to be 120 characters or fewer.";

  const email = s(input.email);
  if (!email) errors.email = "Please enter your email address so we can reply.";
  else if (email.length > 254 || !EMAIL.test(email)) errors.email = "That email address does not look right. Check it and try again.";

  const phone = s(input.phone);
  if (phone) {
    if (phone.length < 8 || phone.length > 20 || !PHONE_CHARS.test(phone)) {
      errors.phone = "Enter a valid phone number, for example 0412 345 678.";
    }
  } else if (type === "quote" || type === "fleet") {
    errors.phone = "Please enter a phone number so we can call you back.";
  }

  const message = s(input.message);
  if (message) {
    if (message.length < 5) errors.message = "Please add a little more detail (at least 5 characters).";
    else if (message.length > 3000) errors.message = "Your message needs to be 3,000 characters or fewer.";
  } else if (type === "contact") {
    errors.message = "Please tell us how we can help.";
  }

  const rego = s(input.rego);
  const tyreSize = s(input.tyre_size);
  if (tyreSize.length > 40) errors.tyre_size = "That tyre size is too long. Try something like 205/55R16.";
  if (rego) {
    const cleaned = normaliseRego(rego);
    if (!REGO.test(cleaned) || cleaned.length > 10) errors.rego = "Enter your number plate using letters and numbers only.";
    if (!input.rego_state || !(REGO_STATES as readonly string[]).includes(input.rego_state)) {
      errors.rego_state = "Choose the state your number plate is registered in.";
    }
  }
  if (type === "quote" && !tyreSize && !rego) {
    errors.tyre_size = "Enter your tyre size (for example 205/55R16) or your number plate.";
  }

  const suburb = s(input.suburb);
  const postcode = s(input.postcode);
  if (suburb.length > 100) errors.suburb = "That suburb name is too long.";
  if (postcode && !POSTCODE.test(postcode)) errors.postcode = "Enter a 4-digit postcode.";
  if (type === "out_of_area" && !suburb && !postcode) {
    errors.suburb = "Enter your suburb or postcode so we know where you are.";
  }

  if (type === "fleet") {
    const company = s(input.company);
    if (!company) errors.company = "Please enter your company name.";
    else if (company.length > 150) errors.company = "Your company name needs to be 150 characters or fewer.";

    const size = s(input.fleet_size);
    if (!size) errors.fleet_size = "Please tell us roughly how many vehicles are in your fleet.";
    else if (!INTEGER.test(size) || Number(size) < 1 || Number(size) > 100000) {
      errors.fleet_size = "Enter a whole number between 1 and 100,000.";
    }
  }

  return errors;
}

/**
 * Builds the JSON body for Laravel from raw form values: keeps only known
 * fields, trims, drops empty optionals and coerces `fleet_size`. Never adds
 * anything the form did not collect. `website` (the honeypot) is passed on
 * verbatim so the API can do its own silent discard.
 */
export function toEnquiryPayload(input: EnquiryInput): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const field of ENQUIRY_FIELDS) {
    const raw = input[field];
    if (typeof raw !== "string") continue;
    if (field === "website") {
      out.website = raw;
      continue;
    }
    const value = raw.trim();
    if (!value) continue;
    if (field === "fleet_size") out.fleet_size = Number(value);
    else if (field === "rego") out.rego = normaliseRego(value);
    else out[field] = value;
  }
  return out;
}

/** The first field with an error, in the order the form renders them. */
export function firstErrorField(errors: EnquiryErrors, order: readonly string[]): string | null {
  for (const key of order) if ((errors as Record<string, string | undefined>)[key]) return key;
  return null;
}
