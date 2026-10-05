import { afterEach, describe, expect, it, vi } from "vitest";
import { findUnresolvedTokens, isStubBody, warnUnresolvedTokens } from "@/lib/content/guards";

describe("content token guard", () => {
  it("flags [UPPER_CASE] placeholder tokens", () => {
    expect(findUnresolvedTokens("Book up to [MAX_BOOKING_WINDOW_DAYS] days ahead.")).toEqual(["[MAX_BOOKING_WINDOW_DAYS]"]);
    expect(findUnresolvedTokens("Email [PRIVACY_EMAIL] or ABN [ABN_PLACEHOLDER].")).toEqual(["[PRIVACY_EMAIL]", "[ABN_PLACEHOLDER]"]);
    expect(findUnresolvedTokens("Contact [EMAIL] now")).toEqual(["[EMAIL]"]);
  });

  it("de-duplicates repeated tokens", () => {
    expect(findUnresolvedTokens("[PRIVACY_EMAIL] and again [PRIVACY_EMAIL]")).toEqual(["[PRIVACY_EMAIL]"]);
  });

  it("leaves normal copy, markdown-ish brackets and empty input alone", () => {
    expect(findUnresolvedTokens("Tyres [205/55 R16] fitted [free]")).toEqual([]);
    expect(findUnresolvedTokens("See [Terms] and [FAQ]")).toEqual([]);
    expect(findUnresolvedTokens("")).toEqual([]);
    expect(findUnresolvedTokens(null)).toEqual([]);
    expect(findUnresolvedTokens(undefined)).toEqual([]);
  });

  describe("warnUnresolvedTokens", () => {
    afterEach(() => vi.restoreAllMocks());

    it("warns in development and names the token and source", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      warnUnresolvedTokens("faq:12", "Up to [MAX_BOOKING_WINDOW_DAYS] days");
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain("[MAX_BOOKING_WINDOW_DAYS]");
      expect(warn.mock.calls[0][0]).toContain("faq:12");
    });

    it("stays silent for clean content and in production", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      warnUnresolvedTokens("faq:1", "All good");
      vi.stubEnv("NODE_ENV", "production");
      warnUnresolvedTokens("faq:2", "Up to [MAX_BOOKING_WINDOW_DAYS] days");
      vi.unstubAllEnvs();
      expect(warn).not.toHaveBeenCalled();
    });
  });
});

describe("isStubBody", () => {
  it("treats a heading plus one short line as a stub", () => {
    expect(isStubBody("<h2>About</h2><p>We service Richmond and surrounds.</p>")).toBe(true);
    expect(isStubBody(null)).toBe(true);
  });
  it("accepts a real body", () => {
    expect(isStubBody(`<p>${"Real copy. ".repeat(20)}</p>`)).toBe(false);
  });
});
