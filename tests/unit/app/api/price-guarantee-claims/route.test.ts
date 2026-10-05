import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/price-guarantee-claims/route";
import { priceGuaranteeBackend } from "@/lib/price-guarantee/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import type { PriceGuaranteeClaimCreateInput } from "@/lib/price-guarantee/types";

/**
 * `app/api/price-guarantee-claims/route.ts` had **zero test coverage**
 * before this file — same class of gap qa-lead caught and closed in Phase 4
 * for `order-token-cookie.ts` + `app/api/orders/route.ts` (both auth
 * short-circuit boundaries left untested on first pass). Mirrors
 * `tests/unit/app/api/orders/[id]/route.test.ts`'s coverage shape for the
 * same reason that file exists: this route's whole job, per its own
 * docblock, is a `401` short-circuit with **no backend round trip at all**
 * when there's no session cookie (unlike every other proxy route in this
 * app, there is no guest/manage-token fallback to attempt here — see
 * `lib/price-guarantee/types.ts`'s doc comment), and otherwise a verbatim
 * status/body passthrough to `priceGuaranteeBackend.create`/`.list`.
 */

vi.mock("@/lib/price-guarantee/backend", () => ({
  priceGuaranteeBackend: { create: vi.fn(), list: vi.fn() },
}));
vi.mock("@/lib/auth/cookies", () => ({
  getAuthToken: vi.fn(),
}));

const inputBody: PriceGuaranteeClaimCreateInput = {
  competitor_url: "https://competitor.example.com/product",
  competitor_price: 18900,
  tyre_variant_id: 5,
  order_id: null,
};

function makePostRequest(body: PriceGuaranteeClaimCreateInput = inputBody): Request {
  return new Request("http://localhost/api/price-guarantee-claims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(query = ""): Request {
  return new Request(`http://localhost/api/price-guarantee-claims${query}`, { method: "GET" });
}

describe("POST /api/price-guarantee-claims", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401s with no call to priceGuaranteeBackend.create at all when getAuthToken returns nothing", async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);

    const response = await POST(makePostRequest());
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ message: "You need to be signed in to submit a price-match claim." });
    // The actual point of this test: not just the status code, but that the
    // backend was never even reached.
    expect(priceGuaranteeBackend.create).not.toHaveBeenCalled();
  });

  it("with a token present, proxies to priceGuaranteeBackend.create with the token and parsed body", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(priceGuaranteeBackend.create).mockResolvedValue({
      status: 201,
      body: { data: { id: 9, status: "pending" } },
    });

    const response = await POST(makePostRequest());
    await response.json();

    expect(priceGuaranteeBackend.create).toHaveBeenCalledWith("auth-tok-1", inputBody);
  });

  it("passes the backend's status/body through verbatim on success (201)", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    const backendBody = { data: { id: 9, status: "pending", competitor_price: 18900 } };
    vi.mocked(priceGuaranteeBackend.create).mockResolvedValue({ status: 201, body: backendBody });

    const response = await POST(makePostRequest());
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json).toEqual(backendBody);
  });

  it("passes a non-201 backend response through verbatim too (e.g. a 422 validation error)", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    const errorBody = {
      message: "The given data was invalid.",
      errors: { competitor_price: ["The competitor price must be greater than 0."] },
    };
    vi.mocked(priceGuaranteeBackend.create).mockResolvedValue({ status: 422, body: errorBody });

    const response = await POST(makePostRequest());
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json).toEqual(errorBody);
  });
});

describe("GET /api/price-guarantee-claims", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401s with no call to priceGuaranteeBackend.list at all when getAuthToken returns nothing", async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);

    const response = await GET(makeGetRequest());
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ message: "You need to be signed in to view your price-match claims." });
    expect(priceGuaranteeBackend.list).not.toHaveBeenCalled();
  });

  it("with a token present and no ?page= param, proxies to priceGuaranteeBackend.list with page=undefined", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(priceGuaranteeBackend.list).mockResolvedValue({
      status: 200,
      body: { data: [], meta: { current_page: 1, per_page: 20, total: 0, last_page: 1 }, links: {} },
    });

    const response = await GET(makeGetRequest());
    await response.json();

    expect(priceGuaranteeBackend.list).toHaveBeenCalledWith("auth-tok-1", undefined);
  });

  it("with a token present and ?page=2, parses it to a number before forwarding", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(priceGuaranteeBackend.list).mockResolvedValue({
      status: 200,
      body: { data: [], meta: { current_page: 2, per_page: 20, total: 0, last_page: 2 }, links: {} },
    });

    const response = await GET(makeGetRequest("?page=2"));
    await response.json();

    expect(priceGuaranteeBackend.list).toHaveBeenCalledWith("auth-tok-1", 2);
  });

  it("passes the backend's status/body through verbatim on success", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    const backendBody = {
      data: [{ id: 1, status: "pending" }],
      meta: { current_page: 1, per_page: 20, total: 1, last_page: 1 },
      links: {},
    };
    vi.mocked(priceGuaranteeBackend.list).mockResolvedValue({ status: 200, body: backendBody });

    const response = await GET(makeGetRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(backendBody);
  });

  it("replaces a 5xx backend body with the friendly error (no upstream text leaks)", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    const errorBody = { message: "Internal server error." };
    vi.mocked(priceGuaranteeBackend.list).mockResolvedValue({ status: 500, body: errorBody });

    const response = await GET(makeGetRequest());
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.code).toBe("server_error");
    expect(json.message).not.toContain("Internal server error");
  });
});
