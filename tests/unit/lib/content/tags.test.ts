import { describe, expect, it } from "vitest";
import {
  brandListTag,
  brandPageTag,
  contentPageDetailTag,
  contentTypeListingTag,
  faqCategoryTag,
  faqGlobalTag,
  faqPageScopedTag,
  promotionTag,
  tyrePdpTag,
} from "@/lib/content/tags";

/**
 * Pins the exact ISR tag string vocabulary this domain relies on — per
 * `lib/content/tags.ts`'s own doc comment, "an untagged fetch is never
 * invalidated... getting these strings right, once, here, is the entire
 * point of this file existing." A typo here would silently desync every
 * tagged fetch across the app from what
 * `App\Contracts\RevalidatesFrontend::revalidationTags()` implementations
 * actually fire on the Laravel side (docs/architecture/02-api-contract.md's
 * "ISR on-demand revalidation webhook" table) — worth pinning exactly, not
 * just smoke-testing that a string is returned.
 */
describe("content ISR tag builders", () => {
  it("contentTypeListingTag", () => {
    expect(contentTypeListingTag("blog_post")).toBe("content:blog_post");
    expect(contentTypeListingTag("location_page")).toBe("content:location_page");
  });

  it("contentPageDetailTag", () => {
    expect(contentPageDetailTag("blog_post", "my-post")).toBe("content:blog_post:my-post");
    expect(contentPageDetailTag("promo_landing", "spring-sale")).toBe("content:promo_landing:spring-sale");
  });

  it("faqGlobalTag", () => {
    expect(faqGlobalTag()).toBe("content:faq");
  });

  it("faqCategoryTag", () => {
    expect(faqCategoryTag("pdp")).toBe("content:faq:pdp");
  });

  it("faqPageScopedTag", () => {
    expect(faqPageScopedTag(42)).toBe("content:faq:page:42");
  });

  it("brandListTag", () => {
    expect(brandListTag()).toBe("content:brand:list");
  });

  it("brandPageTag", () => {
    expect(brandPageTag("bridgestone")).toBe("content:brand:bridgestone");
  });

  it("tyrePdpTag", () => {
    expect(tyrePdpTag("bridgestone-turanza-t005-205-55-r16")).toBe("content:tyre:bridgestone-turanza-t005-205-55-r16");
  });

  it("promotionTag", () => {
    expect(promotionTag(7)).toBe("promotion:7");
  });
});
