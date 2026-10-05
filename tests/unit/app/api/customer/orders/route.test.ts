import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/customer/orders/route";
import { customerOrdersBackend } from "@/lib/customer-orders/backend";
import { getAuthToken } from "@/lib/auth/cookies";

/**
 * `GET /api/customer/orders` — zero test coverage before this file. Same
 * `401`-short-circuit/verbatim-passthrough posture as every other Phase 7
 * route, plus `?page=` parsing (mirrors
 * `tests/unit/app/api/price-guarantee-claims/route.test.ts`'s equivalent
 * coverage for its own `?page=` param).
 */

vi.mock("@/lib/customer-orders/backend", () => ({
  customerOrdersBackend: { list: vi.fn() },
}));
vi.mock("@/lib/auth/cookies", () => ({
  getAuthToken: vi.fn(),
}));

function makeRequest(query = ""): Request {
  return new Request(`http://localhost/api/customer/orders${query}`, { method: "GET" });
}

describe("GET /api/customer/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401s with no call to customerOrdersBackend.list at all when getAuthToken returns nothing", async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);

    const response = await GET(makeRequest());
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ message: "You need to be signed in to view your order history." });
    expect(customerOrdersBackend.list).not.toHaveBeenCalled();
  });

  it("with a token present and no ?page=, proxies with page=undefined", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(customerOrdersBackend.list).mockResolvedValue({
      status: 200,
      body: { data: [], meta: { current_page: 1, per_page: 20, total: 0, last_page: 1 }, links: {} },
    });

    const response = await GET(makeRequest());
    await response.json();

    expect(customerOrdersBackend.list).toHaveBeenCalledWith("auth-tok-1", undefined);
  });

  it("with a token present and ?page=2, parses it to a number before forwarding", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(customerOrdersBackend.list).mockResolvedValue({
      status: 200,
      body: { data: [], meta: { current_page: 2, per_page: 20, total: 0, last_page: 2 }, links: {} },
    });

    const response = await GET(makeRequest("?page=2"));
    await response.json();

    expect(customerOrdersBackend.list).toHaveBeenCalledWith("auth-tok-1", 2);
  });

  it("passes the backend's paginated response through verbatim on success", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    const backendBody = {
      data: [{ id: 1, order_number: "TMS-20260925-0001", status: "confirmed", payment_status: "paid", grand_total: 40000, currency: "AUD", placed_at: "2026-09-20T10:00:00+10:00", booking: null }],
      meta: { current_page: 1, per_page: 20, total: 1, last_page: 1 },
      links: {},
    };
    vi.mocked(customerOrdersBackend.list).mockResolvedValue({ status: 200, body: backendBody });

    const response = await GET(makeRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(backendBody);
  });
});
