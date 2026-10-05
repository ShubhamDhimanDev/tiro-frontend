import { beforeEach, describe, expect, it } from "vitest";
import { readLastSize, writeLastSize } from "@/lib/catalog/last-search";

describe("last size search", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips a valid size", () => {
    writeLastSize({ width: "205", profile: "55", rim_diameter: "16" });
    expect(readLastSize()).toEqual({ width: "205", profile: "55", rim_diameter: "16" });
  });
  it("ignores corrupt or malformed storage", () => {
    window.localStorage.setItem("tiro:last-size", "{nope");
    expect(readLastSize()).toBeNull();
    window.localStorage.setItem("tiro:last-size", JSON.stringify({ width: "abc", profile: "55", rim_diameter: "16" }));
    expect(readLastSize()).toBeNull();
  });
});
