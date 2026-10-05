import { describe, expect, it } from "vitest";
import { absoluteUrl, SITE_URL } from "@/lib/site/url";
import { pageMetadata } from "@/lib/site/seo";

describe("absoluteUrl", () => {
  it("prefixes relative paths with the site origin", () => {
    expect(absoluteUrl("/tyres")).toBe(`${SITE_URL}/tyres`);
    expect(absoluteUrl("tyres")).toBe(`${SITE_URL}/tyres`);
  });
  it("leaves absolute URLs alone", () => {
    expect(absoluteUrl("https://example.com/x")).toBe("https://example.com/x");
  });
});

describe("pageMetadata", () => {
  it("builds title, canonical, Open Graph and Twitter that agree", () => {
    const m = pageMetadata({ title: "Deals", description: "Offers.", path: "/deals" });
    expect(m.title).toBe("Deals | Tiro Mobile Tyres");
    expect(m.alternates?.canonical).toBe("/deals");
    expect(m.openGraph).toMatchObject({ title: "Deals | Tiro Mobile Tyres", url: "/deals", description: "Offers." });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "Deals | Tiro Mobile Tyres" });
  });
  it("does not double the site name and only sets images when given", () => {
    const m = pageMetadata({ title: "Tiro Mobile Tyres | Home", path: "/" });
    expect(m.title).toBe("Tiro Mobile Tyres | Home");
    expect((m.openGraph as { images?: unknown }).images).toBeUndefined();
    expect((pageMetadata({ title: "X", path: "/x", image: "https://cdn/x.png" }).openGraph as { images?: unknown }).images).toEqual([
      "https://cdn/x.png",
    ]);
  });
  it("can mark a page noindex", () => {
    expect(pageMetadata({ title: "X", path: "/x", noindex: true }).robots).toEqual({ index: false, follow: true });
  });
});
