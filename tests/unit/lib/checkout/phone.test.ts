import { describe, expect, it } from "vitest";
import { formatAuMobileToE164 } from "@/lib/checkout/phone";

/**
 * `formatAuMobileToE164()`'s whole job, per its own docblock, is turning
 * every AU-local input shape a customer plausibly types into the exact
 * `/^\+[1-9]\d{6,14}$/` E.164 form `StoreOrderRequest.customer.mobile`
 * (`backend/app/Http/Requests/Api/Orders/StoreOrderRequest.php`) now
 * strictly enforces server-side, or `null` when it can't confidently do so —
 * never a best-effort guess that would silently `422` at submit time.
 */
describe("formatAuMobileToE164", () => {
  it("returns null for empty/whitespace-only input (the field is optional)", () => {
    expect(formatAuMobileToE164("")).toBeNull();
    expect(formatAuMobileToE164("   ")).toBeNull();
  });

  it("passes an already-E.164 number straight through", () => {
    expect(formatAuMobileToE164("+61491570156")).toBe("+61491570156");
  });

  it("strips spaces/dashes from an already-E.164 number", () => {
    expect(formatAuMobileToE164("+61 491 570 156")).toBe("+61491570156");
    expect(formatAuMobileToE164("+61-491-570-156")).toBe("+61491570156");
  });

  it("converts AU national format with a leading 0 (mobile) to E.164", () => {
    expect(formatAuMobileToE164("0412 345 678")).toBe("+61412345678");
    expect(formatAuMobileToE164("0412345678")).toBe("+61412345678");
  });

  it("converts AU national format with a leading 0 (landline, not mobile-specific) to E.164", () => {
    expect(formatAuMobileToE164("02 9123 4567")).toBe("+61291234567");
  });

  it("prepends + to a 61-prefixed number with no leading +", () => {
    expect(formatAuMobileToE164("61412345678")).toBe("+61412345678");
  });

  it("normalizes the 0011 61... international-dialling-prefix case", () => {
    expect(formatAuMobileToE164("0011 61 412 345 678")).toBe("+61412345678");
    expect(formatAuMobileToE164("001161412345678")).toBe("+61412345678");
  });

  it("prepends +61 to a bare 9-digit mobile with no leading 0", () => {
    expect(formatAuMobileToE164("412345678")).toBe("+61412345678");
  });

  it("returns null for a genuinely invalid input (too short)", () => {
    expect(formatAuMobileToE164("12345")).toBeNull();
  });

  it("returns null for a genuinely invalid input (letters)", () => {
    expect(formatAuMobileToE164("not a phone number")).toBeNull();
  });

  it("returns null for an 8-digit number with no leading 0 (not a recognized shape)", () => {
    expect(formatAuMobileToE164("41234567")).toBeNull();
  });

  it("returns null for a 10-digit number not starting with 0 (not a recognized shape)", () => {
    expect(formatAuMobileToE164("4123456789")).toBeNull();
  });

  it("every accepted output satisfies the exact backend regex (/^\\+[1-9]\\d{6,14}$/)", () => {
    const backendRegex = /^\+[1-9]\d{6,14}$/;
    const inputs = ["0412 345 678", "+61491570156", "61412345678", "0011 61 412 345 678", "412345678", "02 9123 4567"];
    for (const input of inputs) {
      const result = formatAuMobileToE164(input);
      expect(result).not.toBeNull();
      expect(result).toMatch(backendRegex);
    }
  });
});
