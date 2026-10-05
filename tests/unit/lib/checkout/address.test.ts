import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveSuburbId, type PlacesAddress } from "@/lib/checkout/address";
import { suburbsApi } from "@/lib/suburbs/client-api";
import type { SuburbsApiResult } from "@/lib/suburbs/client-api";
import type { SuburbsResponse } from "@/lib/suburbs/types";

/**
 * `resolveSuburbId()`'s whole job, per its own docblock, is turning a
 * `GET /api/v1/suburbs` response into exactly one of four distinct outcomes
 * — never a bare `null` that would force the UI to guess why. These tests
 * drive it purely through `suburbsApi.lookup`'s result shape (mocked below)
 * rather than a real network call, mirroring `tests/unit/app/api/booking/route.test.ts`'s
 * "mock the one collaborator, assert the pure logic around it" style.
 */

vi.mock("@/lib/suburbs/client-api", () => ({
  suburbsApi: { lookup: vi.fn() },
}));

function address(overrides: Partial<PlacesAddress> = {}): PlacesAddress {
  return {
    line1: "12 Example St",
    line2: null,
    suburb: "Richmond",
    state: "VIC",
    postcode: "3121",
    lat: -37.8183,
    lng: 144.9931,
    formatted: "12 Example St, Richmond VIC 3121, Australia",
    ...overrides,
  };
}

function success(data: SuburbsResponse["data"]): SuburbsApiResult<SuburbsResponse> {
  return { kind: "success", status: 200, data: { data } };
}

describe("resolveSuburbId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the lookup with the address's postcode and suburb name", async () => {
    vi.mocked(suburbsApi.lookup).mockResolvedValue(success([{ id: 88, name: "Richmond", state: "VIC", postcode: "3121" }]));

    await resolveSuburbId(address());

    expect(suburbsApi.lookup).toHaveBeenCalledWith("3121", "Richmond");
  });

  it("resolves to the single row whose state matches the address", async () => {
    vi.mocked(suburbsApi.lookup).mockResolvedValue(success([{ id: 88, name: "Richmond", state: "VIC", postcode: "3121" }]));

    const result = await resolveSuburbId(address());

    expect(result).toEqual({ status: "resolved", suburbId: 88 });
  });

  it("returns no_match when the endpoint returns an empty data array", async () => {
    vi.mocked(suburbsApi.lookup).mockResolvedValue(success([]));

    const result = await resolveSuburbId(address());

    expect(result).toEqual({ status: "no_match" });
  });

  it("returns no_match when every returned row belongs to a different state than the address", async () => {
    vi.mocked(suburbsApi.lookup).mockResolvedValue(success([{ id: 201, name: "Riverside", state: "NSW", postcode: "2000" }]));

    const result = await resolveSuburbId(address({ suburb: "Riverside", state: "QLD", postcode: "2000" }));

    expect(result).toEqual({ status: "no_match" });
  });

  it("disambiguates a same name+postcode pair across two states by filtering on address.state", async () => {
    vi.mocked(suburbsApi.lookup).mockResolvedValue(
      success([
        { id: 201, name: "Riverside", state: "NSW", postcode: "2000" },
        { id: 202, name: "Riverside", state: "QLD", postcode: "2000" },
      ])
    );

    const result = await resolveSuburbId(address({ suburb: "Riverside", state: "QLD", postcode: "2000" }));

    expect(result).toEqual({ status: "resolved", suburbId: 202 });
  });

  it("returns ambiguous when more than one row survives the state filter (genuine backend data-integrity problem)", async () => {
    vi.mocked(suburbsApi.lookup).mockResolvedValue(
      success([
        { id: 301, name: "Duplicate", state: "VIC", postcode: "3121" },
        { id: 302, name: "Duplicate", state: "VIC", postcode: "3121" },
      ])
    );

    const result = await resolveSuburbId(address({ suburb: "Duplicate" }));

    expect(result).toEqual({ status: "ambiguous" });
  });

  it("returns lookup_failed on a validation_error result rather than throwing", async () => {
    vi.mocked(suburbsApi.lookup).mockResolvedValue({
      kind: "validation_error",
      status: 422,
      message: "The given data was invalid.",
      errors: { postcode: ["The postcode must be a 4-digit number."] },
    });

    const result = await resolveSuburbId(address());

    expect(result).toEqual({ status: "lookup_failed" });
  });

  it("returns lookup_failed on a network/unknown_error result", async () => {
    vi.mocked(suburbsApi.lookup).mockResolvedValue({
      kind: "unknown_error",
      status: 0,
      message: "Couldn't reach the server. Check your connection and try again.",
    });

    const result = await resolveSuburbId(address());

    expect(result).toEqual({ status: "lookup_failed" });
  });
});
