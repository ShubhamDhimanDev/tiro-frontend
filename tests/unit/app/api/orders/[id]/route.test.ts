import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/orders/[id]/route";
import { ordersBackend } from "@/lib/orders/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { getOrderToken } from "@/lib/orders/order-token-cookie";

/**
 * `GET /api/orders/{id}` proxies `GET /api/v1/orders/{order}`. Per its own
 * docblock this has the same auth precedence as `app/api/booking/[id]/route.ts`
 * (no dedicated test file exists yet for that GET route to copy from, so this
 * suite is written directly against this route's docblock and source): bearer
 * token if signed in, otherwise this order's own guest token — never both —
 * and a `403` short-circuit with *no backend round trip* when neither
 * credential is present.
 */

vi.mock("@/lib/orders/backend", () => ({
  ordersBackend: { create: vi.fn(), show: vi.fn() },
}));
vi.mock("@/lib/auth/cookies", () => ({
  getAuthToken: vi.fn(),
}));
vi.mock("@/lib/orders/order-token-cookie", () => ({
  getOrderToken: vi.fn(),
}));

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/orders/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthToken).mockResolvedValue(null);
    vi.mocked(getOrderToken).mockResolvedValue(null);
  });

  it("authenticated: forwards the bearer token and never looks up the stored order token", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(ordersBackend.show).mockResolvedValue({
      status: 200,
      body: { data: { id: 100, order_number: "ORD-100" } },
    });

    const response = await GET(new Request("http://localhost/api/orders/100"), makeParams("100"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.id).toBe(100);
    // Auth precedence: bearer token present means the stored order token is
    // never even read, let alone sent — never both.
    expect(getOrderToken).not.toHaveBeenCalled();
    expect(ordersBackend.show).toHaveBeenCalledWith("100", { token: "auth-tok-1", orderToken: null });
  });

  it("guest with a stored order token: forwards the order token and no bearer token", async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);
    vi.mocked(getOrderToken).mockResolvedValue("guest-order-tok");
    vi.mocked(ordersBackend.show).mockResolvedValue({
      status: 200,
      body: { data: { id: 101, order_number: "ORD-101" } },
    });

    const response = await GET(new Request("http://localhost/api/orders/101"), makeParams("101"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.id).toBe(101);
    expect(getOrderToken).toHaveBeenCalledWith("101");
    expect(ordersBackend.show).toHaveBeenCalledWith("101", { token: null, orderToken: "guest-order-tok" });
  });

  it("neither bearer token nor stored order token: 403s without ever calling the backend", async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);
    vi.mocked(getOrderToken).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/orders/999"), makeParams("999"));
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json).toEqual({ message: "You don't have permission to view this order." });
    expect(ordersBackend.show).not.toHaveBeenCalled();
  });

  it("passes the backend's status/body through unchanged on success (e.g. a 200 with line_items/booking present on the GET-only shape)", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-2");
    const backendBody = {
      data: {
        id: 102,
        order_number: "ORD-102",
        status: "confirmed",
        payment_status: "paid",
        subtotal: 40000,
        discount_total: 0,
        tax_total: 3636,
        service_fee_total: 0,
        grand_total: 40000,
        currency: "AUD",
        line_items: [{ tyre_variant_id: 7, quantity: 4, unit_price: 10000, discount_amount: 0, tax_amount: 909, line_total: 40000 }],
        booking: { scheduled_date: "2026-09-25", slot_start: "09:00", slot_end: "09:30" },
      },
    };
    vi.mocked(ordersBackend.show).mockResolvedValue({ status: 200, body: backendBody });

    const response = await GET(new Request("http://localhost/api/orders/102"), makeParams("102"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(backendBody);
  });

  it("passes a non-200 backend response through unchanged (e.g. a 404 for a genuinely missing order once authorized)", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-3");
    const errorBody = { message: "No query results for model [Order]." };
    vi.mocked(ordersBackend.show).mockResolvedValue({ status: 404, body: errorBody });

    const response = await GET(new Request("http://localhost/api/orders/9999"), makeParams("9999"));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json).toEqual(errorBody);
  });
});
