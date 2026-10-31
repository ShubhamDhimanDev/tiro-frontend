import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/orders/[id]/stripe-confirm/route";
import { ordersBackend } from "@/lib/orders/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { getOrderToken } from "@/lib/orders/order-token-cookie";

/**
 * `POST /api/orders/{id}/stripe-confirm` proxies
 * `POST /api/v1/orders/{order}/stripe-confirm`: bearer token if signed in,
 * otherwise this order's own guest token (never both), and a `403`
 * short-circuit with no backend round trip when neither is present.
 */

vi.mock("@/lib/orders/backend", () => ({
  ordersBackend: { stripeConfirm: vi.fn() },
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

const request = () => new Request("http://localhost/api/orders/100/stripe-confirm", { method: "POST" });

describe("POST /api/orders/[id]/stripe-confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthToken).mockResolvedValue(null);
    vi.mocked(getOrderToken).mockResolvedValue(null);
  });

  it("authenticated: forwards the bearer token and never reads the stored order token", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(ordersBackend.stripeConfirm).mockResolvedValue({ status: 200, body: { data: { id: 100, payment_status: "paid" } } });

    const response = await POST(request(), makeParams("100"));

    expect(response.status).toBe(200);
    expect((await response.json()).data.payment_status).toBe("paid");
    expect(getOrderToken).not.toHaveBeenCalled();
    expect(ordersBackend.stripeConfirm).toHaveBeenCalledWith("100", { token: "auth-tok-1", orderToken: null });
  });

  it("guest: forwards the stored order token and no bearer token", async () => {
    vi.mocked(getOrderToken).mockResolvedValue("guest-order-tok");
    vi.mocked(ordersBackend.stripeConfirm).mockResolvedValue({ status: 200, body: { data: { id: 101 } } });

    const response = await POST(request(), makeParams("101"));

    expect(response.status).toBe(200);
    expect(getOrderToken).toHaveBeenCalledWith("101");
    expect(ordersBackend.stripeConfirm).toHaveBeenCalledWith("101", { token: null, orderToken: "guest-order-tok" });
  });

  it("neither credential: 403s without calling the backend", async () => {
    const response = await POST(request(), makeParams("999"));

    expect(response.status).toBe(403);
    expect(ordersBackend.stripeConfirm).not.toHaveBeenCalled();
  });

  it("passes a non-200 backend response through unchanged", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-2");
    vi.mocked(ordersBackend.stripeConfirm).mockResolvedValue({ status: 422, body: { message: "This order was not paid through Stripe." } });

    const response = await POST(request(), makeParams("102"));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ message: "This order was not paid through Stripe." });
  });
});
