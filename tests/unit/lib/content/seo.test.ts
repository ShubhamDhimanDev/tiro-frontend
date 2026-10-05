import { describe, expect, it } from "vitest";
import { resolveMetaDescription, resolveMetaTitle, resolveOgImage } from "@/lib/content/seo";

/**
 * `lib/content/seo.ts`'s fallback chain is the one place this app applies
 * the "meta_title/meta_description/og_image_path fall back to
 * title/excerpt/featured_image_path when null" rule — confirmed this isn't
 * resolved server-side (see that file's own doc comment). Pure logic, no
 * backend/browser needed, exactly what belongs in this unit suite rather
 * than the E2E suite.
 */
describe("resolveMetaTitle", () => {
  it("prefers meta_title when set", () => {
    expect(resolveMetaTitle({ meta_title: "Custom SEO Title", title: "Page Title" })).toBe("Custom SEO Title");
  });

  it("falls back to title when meta_title is null", () => {
    expect(resolveMetaTitle({ meta_title: null, title: "Page Title" })).toBe("Page Title");
  });
});

describe("resolveMetaDescription", () => {
  it("prefers meta_description when set", () => {
    expect(resolveMetaDescription({ meta_description: "Custom description", excerpt: "Excerpt" })).toBe(
      "Custom description"
    );
  });

  it("falls back to excerpt when meta_description is null", () => {
    expect(resolveMetaDescription({ meta_description: null, excerpt: "Excerpt" })).toBe("Excerpt");
  });

  it("falls back to undefined when both are null (never an empty string)", () => {
    expect(resolveMetaDescription({ meta_description: null, excerpt: null })).toBeUndefined();
  });
});

describe("resolveOgImage", () => {
  it("prefers og_image_path when set", () => {
    expect(resolveOgImage({ og_image_path: "/og.jpg", featured_image_path: "/featured.jpg" })).toBe("/og.jpg");
  });

  it("falls back to featured_image_path when og_image_path is null", () => {
    expect(resolveOgImage({ og_image_path: null, featured_image_path: "/featured.jpg" })).toBe("/featured.jpg");
  });

  it("falls back to null (not undefined) when both are null", () => {
    expect(resolveOgImage({ og_image_path: null, featured_image_path: null })).toBeNull();
  });
});
