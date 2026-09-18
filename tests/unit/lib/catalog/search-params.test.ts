import { describe, expect, it } from "vitest";
import {
  normalizeSearchParams,
  isSearchRequest,
  isStaggeredSearch,
  buildTyreSearchQuery,
  buildTyresPageHref,
  buildTyresStaggeredPageHref,
} from "@/lib/catalog/search-params";

describe("normalizeSearchParams", () => {
  it("flattens array values (Next's searchParams shape) to their first element", () => {
    expect(normalizeSearchParams({ width: ["205", "215"], profile: "55" })).toEqual({
      width: "205",
      profile: "55",
    });
  });
});

describe("isSearchRequest / isStaggeredSearch", () => {
  it("is not a search request with no size filters", () => {
    expect(isSearchRequest({})).toBe(false);
  });

  it("is a search request once any flat size field is present", () => {
    expect(isSearchRequest({ width: "205" })).toBe(true);
  });

  it("treats staggered=true with no side filters as not-yet-a-search", () => {
    expect(isSearchRequest({ staggered: "true" })).toBe(false);
  });

  it("is a search request once any staggered side field is present", () => {
    expect(isSearchRequest({ staggered: "true", front_width: "205" })).toBe(true);
    expect(isStaggeredSearch({ staggered: "true" })).toBe(true);
  });
});

describe("buildTyreSearchQuery", () => {
  it("only sets zone when resolved", () => {
    const withoutZone = buildTyreSearchQuery({ width: "205" });
    expect(withoutZone.has("zone")).toBe(false);

    const withZone = buildTyreSearchQuery({ width: "205" }, { zoneId: "3" });
    expect(withZone.get("zone")).toBe("3");
  });

  it("defaults page to 1 for flat search and doesn't emit front_page/rear_page", () => {
    const query = buildTyreSearchQuery({ width: "205", profile: "55", rim_diameter: "16" });
    expect(query.get("page")).toBe("1");
    expect(query.has("front_page")).toBe(false);
    expect(query.has("rear_page")).toBe(false);
  });

  /**
   * The load-bearing regression this phase fixed: front and rear paginate
   * via two distinct params, not one shared `page` — see frontend/CLAUDE.md's
   * "Staggered search pagination (reconciled 2026-09-11)".
   */
  it("emits independent front_page/rear_page for staggered search, never a shared page", () => {
    const values = { staggered: "true", front_width: "205", rear_width: "225" };

    const query = buildTyreSearchQuery(values, { frontPage: 2, rearPage: 1 });
    expect(query.get("front_page")).toBe("2");
    expect(query.get("rear_page")).toBe("1");
    expect(query.has("page")).toBe(false);
  });

  it("falls back to the values' own front_page/rear_page when opts don't override them", () => {
    const values = { staggered: "true", front_page: "3", rear_page: "5" };
    const query = buildTyreSearchQuery(values);
    expect(query.get("front_page")).toBe("3");
    expect(query.get("rear_page")).toBe("5");
  });
});

describe("buildTyresPageHref", () => {
  it("preserves existing filters and sets the requested page", () => {
    const href = buildTyresPageHref({ width: "205", profile: "55", rim_diameter: "16" }, 2);
    const url = new URL(href, "http://example.test");
    expect(url.pathname).toBe("/tyres");
    expect(url.searchParams.get("width")).toBe("205");
    expect(url.searchParams.get("page")).toBe("2");
  });
});

describe("buildTyresStaggeredPageHref", () => {
  /**
   * Advancing one side's page must not disturb the other side's current
   * page — the core "independent pagination" property under test end-to-end
   * in Playwright, pinned here at the pure-function level too.
   */
  it("advancing the front page preserves the rear page untouched", () => {
    const values = { staggered: "true", front_page: "1", rear_page: "4" };
    const href = buildTyresStaggeredPageHref(values, "front", 2);
    const url = new URL(href, "http://example.test");
    expect(url.searchParams.get("front_page")).toBe("2");
    expect(url.searchParams.get("rear_page")).toBe("4");
  });

  it("advancing the rear page preserves the front page untouched", () => {
    const values = { staggered: "true", front_page: "3", rear_page: "1" };
    const href = buildTyresStaggeredPageHref(values, "rear", 2);
    const url = new URL(href, "http://example.test");
    expect(url.searchParams.get("front_page")).toBe("3");
    expect(url.searchParams.get("rear_page")).toBe("2");
  });

  it("defaults the untouched side to page 1 when it isn't present yet", () => {
    const href = buildTyresStaggeredPageHref({ staggered: "true" }, "front", 2);
    const url = new URL(href, "http://example.test");
    expect(url.searchParams.get("rear_page")).toBe("1");
  });
});
