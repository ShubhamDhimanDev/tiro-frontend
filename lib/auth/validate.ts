/**
 * Client-side field checks for the auth forms. The forms set `noValidate`
 * (native browser bubbles are unstyled, overlap labels and cannot be linked
 * with `aria-describedby`), so these supply our own inline messages. The
 * server stays the authority: these only catch the obvious gaps before a
 * round trip, and server `errors` still render in the same slots.
 */

export type FieldErrors = Record<string, string[]>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Enter your email address.";
  return EMAIL.test(v) ? null : "Enter a valid email address, like name@example.com.";
}

export function passwordError(value: string, { min = 0 }: { min?: number } = {}): string | null {
  if (!value) return "Enter your password.";
  return min > 0 && value.length < min ? `Use at least ${min} characters.` : null;
}

export function codeError(value: string): string | null {
  return /^\d{6}$/.test(value) ? null : "Enter the 6-digit code from your email.";
}

/** Builds a `FieldErrors` map from `{field: message | null}` pairs; empty when everything passes. */
export function collectErrors(checks: Record<string, string | null>): FieldErrors {
  const out: FieldErrors = {};
  for (const [field, message] of Object.entries(checks)) if (message) out[field] = [message];
  return out;
}
