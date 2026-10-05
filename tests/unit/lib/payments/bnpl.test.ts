import { describe, expect, it } from "vitest";
import { enabledBnplProviders, instalmentCents } from "@/lib/payments/bnpl";

describe("bnpl", () => {
  it("defaults to afterpay and paypal", () => {
    expect(enabledBnplProviders(undefined)).toEqual(["afterpay", "paypal"]);
  });
  it("parses a list, ignoring unknown names and case, and an empty string hides everything", () => {
    expect(enabledBnplProviders("Zip, klarna ,paypal")).toEqual(["zip", "paypal"]);
    expect(enabledBnplProviders("")).toEqual([]);
  });
  it("rounds an instalment up so four payments cover the total", () => {
    expect(instalmentCents(82400)).toBe(20600);
    expect(instalmentCents(10001)).toBe(2501);
  });
});
