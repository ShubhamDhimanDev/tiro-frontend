import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/catalog/tyres/count/route";
import { catalogBackend } from "@/lib/catalog/backend";

vi.mock("@/lib/catalog/backend", () => ({ catalogBackend: { search: vi.fn() } }));
vi.mock("@/lib/location/cookies", () => ({ getServiceZone: vi.fn().mockResolvedValue({ zoneId: "3", label: "Melbourne Metro" }) }));

const get = (qs: string) => GET(new Request(`http://localhost/api/catalog/tyres/count?${qs}`));

describe("GET /api/catalog/tyres/count", () => {
  beforeEach(() => vi.mocked(catalogBackend.search).mockReset());

  it("asks the API for one row with the same filters and the visitor's zone, and returns meta.total", async () => {
    vi.mocked(catalogBackend.search).mockResolvedValue({ status: 200, body: { data: [], meta: { total: 24 } } });
    const res = await get("width=205&profile=55&rim_diameter=16&brand=michelin&tyre_type=performance&page=4&per_page=50");

    expect(await res.json()).toEqual({ total: 24 });
    const query = vi.mocked(catalogBackend.search).mock.calls[0][0];
    expect(query.get("per_page")).toBe("1");
    expect(query.get("page")).toBe("1");
    expect(query.get("zone")).toBe("3");
    expect(query.get("brand")).toBe("michelin");
    expect(query.get("tyre_type")).toBe("performance");
    expect(query.get("width")).toBe("205");
    expect(vi.mocked(catalogBackend.search).mock.calls[0][1]).toEqual({ cache: "no-store" });
  });

  it("works for a filter-only browse (no size)", async () => {
    vi.mocked(catalogBackend.search).mockResolvedValue({ status: 200, body: { data: [], meta: { total: 0 } } });
    expect(await (await get("brand=bridgestone&category=suv")).json()).toEqual({ total: 0 });
  });

  it("adds front and rear totals for a staggered search", async () => {
    vi.mocked(catalogBackend.search).mockResolvedValue({
      status: 200,
      body: { data: { front: { meta: { total: 3 } }, rear: { meta: { total: 5 } } } },
    });
    const res = await get("staggered=true&front_width=245&front_profile=45&front_rim_diameter=18&rear_width=275&rear_profile=40&rear_rim_diameter=18");
    expect(await res.json()).toEqual({ total: 8 });
    expect(vi.mocked(catalogBackend.search).mock.calls[0][0].get("front_page")).toBe("1");
  });

  it("reports null (button falls back to Apply) when the API fails or the size is invalid", async () => {
    vi.mocked(catalogBackend.search).mockResolvedValue({ status: 422, body: { message: "bad" } });
    expect(await (await get("width=1")).json()).toEqual({ total: null });
    vi.mocked(catalogBackend.search).mockResolvedValue({ status: 503, body: {} });
    expect(await (await get("width=205")).json()).toEqual({ total: null });
  });
});
