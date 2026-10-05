import { describe, expect, it } from "vitest";
import { codeError, collectErrors, emailError, passwordError } from "@/lib/auth/validate";

describe("auth inline validation", () => {
  it("flags missing and malformed emails with our own message", () => {
    expect(emailError("")).toBe("Enter your email address.");
    expect(emailError("   ")).toBe("Enter your email address.");
    expect(emailError("not-an-email")).toMatch(/valid email/i);
    expect(emailError("a@b")).toMatch(/valid email/i);
    expect(emailError(" name@example.com ")).toBeNull();
  });

  it("requires a password and enforces an optional minimum", () => {
    expect(passwordError("")).toBe("Enter your password.");
    expect(passwordError("abc", { min: 8 })).toBe("Use at least 8 characters.");
    expect(passwordError("abcdefgh", { min: 8 })).toBeNull();
    expect(passwordError("x")).toBeNull();
  });

  it("requires a 6-digit email code", () => {
    expect(codeError("12345")).toMatch(/6-digit/);
    expect(codeError("12345a")).toMatch(/6-digit/);
    expect(codeError("123456")).toBeNull();
  });

  it("collects only failing fields into the FormField error map", () => {
    expect(collectErrors({ email: "Enter your email address.", password: null })).toEqual({ email: ["Enter your email address."] });
    expect(collectErrors({ email: null, password: null })).toEqual({});
  });
});
