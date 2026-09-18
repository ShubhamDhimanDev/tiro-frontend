/**
 * Cosmetic normalization only — trims/lowercases before we send a request.
 *
 * docs/architecture/08-customer-auth-otp.md §1 makes email normalization the
 * backend's job ("done once, at the edge" in each Laravel FormRequest) so
 * rate-limit buckets and uniqueness checks are authoritative there. This
 * helper exists purely so the UI doesn't send obviously-different strings
 * for what a user perceives as the same address (e.g. trailing space from a
 * paste) — it is not a substitute for, or a duplicate of, the backend rule.
 */
export function normalizeEmailForDisplay(email: string): string {
  return email.trim().toLowerCase();
}
