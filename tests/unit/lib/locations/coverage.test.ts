import { describe, expect, it } from "vitest";
import {
  EMPTY_COVERAGE,
  addressStateOptions,
  areaPhrase,
  coverageHeading,
  joinNames,
  postcodeHint,
  suburbHint,
  summariseCoverage,
  trustedTitle,
} from "@/lib/locations/coverage";
import { adminImageUrl } from "@/lib/locations/format";
import type { LocationCity, LocationState } from "@/lib/locations/types";

let zone = 0;
function city(name: string, suburbs: [string, string][] = []): LocationCity {
  zone += 1;
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  return {
    name,
    slug,
    service_zone_id: zone,
    service_zone_ids: [zone],
    suburb_count: suburbs.length,
    suburbs: suburbs.map(([n, postcode]) => ({ name: n, slug: n.toLowerCase().replace(/\s+/g, "-"), postcode, service_zone_id: zone })),
  };
}
function state(code: string, name: string, cities: LocationCity[]): LocationState {
  return { code, name, slug: code.toLowerCase(), city_count: cities.length, suburb_count: cities.reduce((n, c) => n + c.suburb_count, 0), cities };
}

const MELBOURNE = state("VIC", "Victoria", [city("Melbourne", [["Melbourne", "3000"], ["Richmond", "3121"], ["St Kilda", "3182"]])]);

describe("summariseCoverage", () => {
  it("is empty when the API serves nothing", () => {
    expect(summariseCoverage([])).toEqual(EMPTY_COVERAGE);
  });

  it("lists the served states and cities in the API's order", () => {
    const c = summariseCoverage([MELBOURNE, state("WA", "Western Australia", [city("Perth", [["Perth", "6000"]])])]);
    expect(c.stateCodes).toEqual(["VIC", "WA"]);
    expect(c.stateNames).toEqual(["Victoria", "Western Australia"]);
    expect(c.cityNames).toEqual(["Melbourne", "Perth"]);
  });

  it("ignores a state with no cities", () => {
    expect(summariseCoverage([state("NSW", "New South Wales", []), MELBOURNE]).stateCodes).toEqual(["VIC"]);
  });

  it("picks a suburb that is not the city itself as the example", () => {
    expect(summariseCoverage([MELBOURNE]).example).toEqual({ suburb: "Richmond", postcode: "3121" });
  });

  it("falls back to the city's only suburb, and to no example without suburbs", () => {
    expect(summariseCoverage([state("VIC", "Victoria", [city("Geelong", [["Geelong", "3220"]])])]).example).toEqual({ suburb: "Geelong", postcode: "3220" });
    expect(summariseCoverage([state("VIC", "Victoria", [city("Geelong", [])])]).example).toBeNull();
  });
});

describe("area wording", () => {
  const cov = (names: string[], states: string[] = ["Victoria"]) => ({ ...EMPTY_COVERAGE, cityNames: names, stateNames: states });

  it("joins names", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["A"])).toBe("A");
    expect(joinNames(["A", "B"])).toBe("A and B");
    expect(joinNames(["A", "B", "C"])).toBe("A, B and C");
  });

  it("names the cities for up to three", () => {
    expect(areaPhrase(cov(["Melbourne"]))).toBe("Melbourne");
    expect(areaPhrase(cov(["Melbourne", "Geelong", "Ballarat"]))).toBe("Melbourne, Geelong and Ballarat");
  });

  it("names the state for a longer list in one state, else counts the cities", () => {
    expect(areaPhrase(cov(["A", "B", "C", "D"]))).toBe("Victoria");
    expect(areaPhrase(cov(["A", "B", "C", "D"], ["Victoria", "Queensland"]))).toBe("4 cities");
  });

  it("never claims a place when nothing is served", () => {
    expect(areaPhrase(EMPTY_COVERAGE)).toBeNull();
    expect(coverageHeading(EMPTY_COVERAGE)).toBe("Do we come to you?");
    expect(trustedTitle(EMPTY_COVERAGE)).toBe("Trusted fitting, at your door");
  });

  it("builds the home headings from the served area, and never says nationwide or Australia", () => {
    const c = summariseCoverage([MELBOURNE]);
    expect(coverageHeading(c)).toBe("We come to you in Melbourne");
    expect(trustedTitle(c)).toBe("Trusted in Melbourne");
    expect(coverageHeading(c) + trustedTitle(c)).not.toMatch(/nationwide|australia/i);
  });
});

describe("form hints", () => {
  it("use a real served suburb and postcode", () => {
    const c = summariseCoverage([MELBOURNE]);
    expect(suburbHint(c)).toBe("e.g. Richmond or 3121");
    expect(postcodeHint(c)).toBe("Or a 4-digit postcode, like 3121.");
  });

  it("stay neutral when nothing is served", () => {
    expect(suburbHint(EMPTY_COVERAGE)).toBe("Enter your suburb or a 4-digit postcode");
    expect(postcodeHint(EMPTY_COVERAGE)).toBe("Or a 4-digit postcode.");
  });
});

describe("addressStateOptions", () => {
  const ALL = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const;

  it("offers only the served states", () => {
    expect(addressStateOptions(summariseCoverage([MELBOURNE]), ALL)).toEqual(["VIC"]);
  });

  it("falls back to every state while the API gives nothing, so the field is never empty", () => {
    expect(addressStateOptions(EMPTY_COVERAGE, ALL)).toEqual([...ALL]);
  });

  it("keeps an already-selected state, such as a saved address, even if it is no longer served", () => {
    expect(addressStateOptions(summariseCoverage([MELBOURNE]), ALL, "NSW")).toEqual(["VIC", "NSW"]);
    expect(addressStateOptions(summariseCoverage([MELBOURNE]), ALL, "VIC")).toEqual(["VIC"]);
  });
});

describe("adminImageUrl", () => {
  it("accepts absolute and root-relative URLs only", () => {
    expect(adminImageUrl("https://cdn.example.test/a.webp")).toBe("https://cdn.example.test/a.webp");
    expect(adminImageUrl("/storage/a.webp")).toBe("/storage/a.webp");
    expect(adminImageUrl("locations/a.webp")).toBeNull();
    expect(adminImageUrl("  ")).toBeNull();
    expect(adminImageUrl(null)).toBeNull();
    expect(adminImageUrl(undefined)).toBeNull();
  });
});
