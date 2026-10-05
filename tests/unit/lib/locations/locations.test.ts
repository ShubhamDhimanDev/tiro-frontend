import { describe, expect, it, vi } from "vitest";
import { summariseHours, suburbMatches } from "@/lib/locations/format";
import { withApiNav, NAV_GROUPS } from "@/lib/site/nav";

vi.mock("@/lib/locations/backend", () => ({ locationsBackend: { tree: vi.fn(), city: vi.fn() } }));

import { locationsBackend } from "@/lib/locations/backend";
import { cityHref, flattenCities, loadLocationTree } from "@/lib/locations/helpers";
import { FIXTURE_LOCATION_TREE, buildFixtureCityDetail } from "@/lib/locations/fixtures";

describe("suburbMatches", () => {
  const s = { name: "St Kilda", postcode: "3182" };
  it("matches by name, postcode prefix or both, case-insensitively", () => {
    expect(suburbMatches(s, "kilda")).toBe(true);
    expect(suburbMatches(s, "31")).toBe(true);
    expect(suburbMatches(s, "st kilda 3182")).toBe(true);
    expect(suburbMatches(s, "  ")).toBe(true);
    expect(suburbMatches(s, "richmond")).toBe(false);
    expect(suburbMatches(s, "3121")).toBe(false);
  });
});

describe("summariseHours", () => {
  it("merges consecutive days with the same hours and names closed days", () => {
    expect(
      summariseHours({
        mon: { open: "07:00", close: "19:00" },
        tue: { open: "07:00", close: "19:00" },
        wed: { open: "07:00", close: "19:00" },
        thu: { open: "07:00", close: "19:00" },
        fri: { open: "07:00", close: "19:00" },
        sat: { open: "08:00", close: "16:00" },
        sun: null,
      }),
    ).toEqual(["Mon to Fri: 7am to 7pm", "Sat: 8am to 4pm", "Sun: closed"]);
  });
});

describe("city helpers", () => {
  it("builds state/city hrefs and flattens the tree in order", () => {
    expect(cityHref("vic", "melbourne")).toBe("/locations/vic/melbourne");
    expect(flattenCities(FIXTURE_LOCATION_TREE).map((c) => c.href)).toEqual([
      "/locations/nsw/sydney",
      "/locations/vic/geelong",
      "/locations/vic/melbourne",
    ]);
  });

  it("returns an empty tree (graceful empty state) when the API fails", async () => {
    vi.mocked(locationsBackend.tree).mockResolvedValue({ status: 503, body: { message: "down" } });
    expect(await loadLocationTree()).toEqual([]);
    vi.mocked(locationsBackend.tree).mockResolvedValue({ status: 200, body: { data: FIXTURE_LOCATION_TREE } });
    expect(await loadLocationTree()).toHaveLength(2);
  });

  it("fixture city detail matches the contract shape", () => {
    const d = buildFixtureCityDetail("vic", "melbourne")!;
    expect(d.state).toEqual({ code: "VIC", name: "Victoria", slug: "vic" });
    expect(d.suburbs.length).toBe(d.city.suburb_count);
    expect(buildFixtureCityDetail("vic", "nowhere")).toBeNull();
  });
});

describe("withApiNav", () => {
  const cities = [{ name: "Melbourne", stateCode: "VIC", href: "/locations/vic/melbourne" }];
  it("lists cities in Locations and adds the offer promo to Offers", () => {
    const groups = withApiNav(NAV_GROUPS, {
      cities,
      promo: { href: "/deals/x", eyebrow: "Ends 30 Dec", title: "4 for 3", body: "Fourth tyre free", cta: "See the offer" },
    });
    const where = groups.find((g) => g.key === "locations")!;
    expect(where.links[0]).toEqual({ href: "/locations/vic/melbourne", label: "Melbourne, VIC" });
    expect(where.links.map((l) => l.href)).toContain("/locations");
    expect(groups.find((g) => g.key === "offers")!.promo?.href).toBe("/deals/x");
  });
  it("leaves the static groups alone when the API has nothing", () => {
    const groups = withApiNav(NAV_GROUPS, { cities: [], promo: null });
    expect(groups).toEqual(NAV_GROUPS);
    expect(groups.find((g) => g.key === "offers")!.promo).toBeUndefined();
  });
});
