import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/catalog/backend", () => ({ catalogBackend: { search: vi.fn(), brands: vi.fn() } }));
vi.mock("@/lib/content/backend", () => ({ contentBackend: { pages: vi.fn() } }));
vi.mock("@/lib/locations/backend", () => ({ locationsBackend: { tree: vi.fn() } }));
vi.mock("@/lib/offers/backend", () => ({ offersBackend: { list: vi.fn() } }));

import { catalogBackend } from "@/lib/catalog/backend";
import { contentBackend } from "@/lib/content/backend";
import { locationsBackend } from "@/lib/locations/backend";
import { offersBackend } from "@/lib/offers/backend";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { FIXTURE_LOCATION_TREE } from "@/lib/locations/fixtures";

beforeEach(() => {
  vi.mocked(catalogBackend.search).mockResolvedValue({
    status: 200,
    body: { data: [{ slug: "tyre-a-205-55-r16" }], meta: { current_page: 1, per_page: 100, total: 1, last_page: 1 }, links: {} },
  });
  vi.mocked(catalogBackend.brands).mockResolvedValue({ status: 200, body: { data: [{ slug: "michelin" }] } });
  vi.mocked(contentBackend.pages).mockImplementation(async (params: URLSearchParams) => ({
    status: 200,
    body: {
      data: params.get("type") === "blog_post" ? [{ slug: "post-1", updated_at: "2026-09-01T00:00:00Z", published_at: null }] : [],
      meta: {},
      links: {},
    },
  }));
  vi.mocked(locationsBackend.tree).mockResolvedValue({ status: 200, body: { data: FIXTURE_LOCATION_TREE } });
  vi.mocked(offersBackend.list).mockResolvedValue({
    status: 200,
    body: { data: [{ slug: "four-for-three", ends_at: "2099-01-01", starts_at: "2026-01-01" }] },
  });
});

describe("sitemap", () => {
  it("lists static, location, offer, brand, tyre and blog URLs as absolute URLs", async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.every((u) => u.startsWith("http"))).toBe(true);
    const paths = urls.map((u) => new URL(u).pathname);
    for (const p of [
      "/",
      "/tyres",
      "/deals",
      "/locations",
      "/contact",
      "/deals/four-for-three",
      "/brands/michelin",
      "/tyres/tyre-a-205-55-r16",
      "/blog/post-1",
      "/locations/vic/melbourne",
    ]) {
      expect(paths).toContain(p);
    }
  });

  it("never lists transactional or personal routes, suburb pages or duplicates", async () => {
    const paths = (await sitemap()).map((e) => new URL(e.url).pathname);
    for (const p of paths) expect(p).not.toMatch(/^\/(account|cart|checkout|booking|orders|login|register|api)/);
    expect(paths.filter((p) => p.startsWith("/locations") && p.split("/").length > 4)).toEqual([]);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("still returns the static URLs when every API is down", async () => {
    vi.mocked(catalogBackend.search).mockResolvedValue({ status: 503, body: {} });
    vi.mocked(catalogBackend.brands).mockResolvedValue({ status: 503, body: {} });
    vi.mocked(contentBackend.pages).mockResolvedValue({ status: 503, body: {} });
    vi.mocked(locationsBackend.tree).mockResolvedValue({ status: 503, body: {} });
    vi.mocked(offersBackend.list).mockResolvedValue({ status: 503, body: {} });
    const paths = (await sitemap()).map((e) => new URL(e.url).pathname);
    expect(paths).toContain("/");
    expect(paths).toContain("/locations");
  });
});

describe("robots", () => {
  it("allows the site, blocks private routes and points at the sitemap", () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rule.allow).toBe("/");
    expect(rule.disallow).toEqual(expect.arrayContaining(["/account", "/cart", "/checkout", "/booking", "/api/"]));
    expect(r.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});
