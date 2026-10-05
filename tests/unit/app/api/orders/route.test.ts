import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/orders/route";
import { ordersBackend } from "@/lib/orders/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { getBookingManageToken } from "@/lib/booking/manage-token-cookie";
import { setOrderToken } from "@/lib/orders/order-token-cookie";
import type { OrderCreateInput, OrderCreateResponse } from "@/lib/orders/types";

/**
 * `POST /api/orders`'s whole job, per its own docblock, is proxying to
 * `POST /api/v1/orders` while making sure `order_token` — a bearer-equivalent
 * secret for guest orders — never reaches the JSON the browser actually
 * receives, while deliberately leaving `order_token_issued` and
 * `payment.client_secret` untouched (the latter is the one secret meant to
 * reach client JS, for Stripe's Payment Element). Mirrors
 * `tests/unit/app/api/booking/route.test.ts`'s coverage shape, plus two
 * cases that template didn't need: `client_secret` survival, and the
 * booking-manage-token-not-order-token auth wiring this route uses at
 * creation time (`authorizeGuestOrOwner()` on the *booking*, per the route's
 * own docblock).
 */

vi.mock("@/lib/orders/backend", () => ({
  ordersBackend: { create: vi.fn(), show: vi.fn() },
}));
vi.mock("@/lib/auth/cookies", () => ({
  getAuthToken: vi.fn(),
}));
vi.mock("@/lib/booking/manage-token-cookie", () => ({
  getBookingManageToken: vi.fn(),
}));
vi.mock("@/lib/orders/order-token-cookie", () => ({
  setOrderToken: vi.fn(),
}));

const inputBody: OrderCreateInput = {
  booking_id: 42,
  customer: { name: "Jess Nguyen", email: "jess@example.com", mobile: "0412345678" },
  address: { suburb_id: 9, line1: "1 Test St", lat: -37.8, lng: 144.9 },
  vehicle: { vehicle_id: 7, rego: "ABC123", state: "VIC" },
};

function makeRequest(idempotencyKey: string): Request {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey, "Content-Type": "application/json" },
    body: JSON.stringify(inputBody),
  });
}

function makeBackendRecord(overrides: Partial<OrderCreateResponse["data"]> = {}): OrderCreateResponse {
  return {
    data: {
      id: 100,
      order_number: "ORD-100",
      status: "pending_payment",
      payment_status: "pending",
      subtotal: 40000,
      discount_total: 0,
      tax_total: 3636,
      service_fee_total: 0,
      grand_total: 40000,
      currency: "AUD",
      order_token: "secret-order-token",
      order_token_issued: true,
      payment: { gateway: "stripe", client_secret: "pi_123_secret_abc", paypal_order_id: null },
      ...overrides,
    },
  };
}

describe("POST /api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthToken).mockResolvedValue(null);
    vi.mocked(getBookingManageToken).mockResolvedValue(null);
  });

  it("strips order_token from the response and stores it via setOrderToken when the backend issues one, leaving order_token_issued and payment.client_secret untouched", async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);
    vi.mocked(getBookingManageToken).mockResolvedValue("booking-manage-tok");
    vi.mocked(ordersBackend.create).mockResolvedValue({ status: 201, body: makeBackendRecord() });

    const response = await POST(makeRequest("key-1"));
    const json = await response.json();

    expect(response.status).toBe(201);
    // Genuinely absent, not merely undefined/falsy — same rigor the booking
    // equivalent test applies to manage_token.
    expect(Object.hasOwn(json.data, "order_token")).toBe(false);
    expect(json.data.order_token_issued).toBe(true);
    expect(json.data.id).toBe(100);

    // payment.client_secret is deliberately NOT stripped — Stripe's Payment
    // Element needs it client-side.
    expect(json.data.payment).toEqual({ gateway: "stripe", client_secret: "pi_123_secret_abc", paypal_order_id: null });

    expect(setOrderToken).toHaveBeenCalledTimes(1);
    expect(setOrderToken).toHaveBeenCalledWith(100, "secret-order-token");

    // Auth wiring: guest request, so the *booking's* manage token is looked
    // up (keyed off body.booking_id) and forwarded, not an order token
    // (there isn't one yet at creation time).
    expect(getBookingManageToken).toHaveBeenCalledWith(42);
    expect(ordersBackend.create).toHaveBeenCalledWith(inputBody, {
      idempotencyKey: "key-1",
      token: null,
      manageToken: "booking-manage-tok",
    });
  });

  it("authenticated request: uses the bearer token and never looks up the booking's guest manage token", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(ordersBackend.create).mockResolvedValue({ status: 201, body: makeBackendRecord({ id: 101 }) });

    const response = await POST(makeRequest("key-2"));
    await response.json();

    expect(getBookingManageToken).not.toHaveBeenCalled();
    expect(ordersBackend.create).toHaveBeenCalledWith(inputBody, {
      idempotencyKey: "key-2",
      token: "auth-tok-1",
      manageToken: null,
    });
  });

  it("forwards order_token_issued=true untouched, leaves client_secret untouched, and does not call setOrderToken when order_token itself is absent (idempotency replay outside the window)", async () => {
    const backendBody = {
      data: {
        id: 102,
        order_number: "ORD-102",
        status: "pending_payment",
        payment_status: "pending",
        subtotal: 40000,
        discount_total: 0,
        tax_total: 3636,
        service_fee_total: 0,
        grand_total: 40000,
        currency: "AUD",
        order_token_issued: true,
        payment: { gateway: "stripe", client_secret: "pi_456_secret_def", paypal_order_id: null },
        // order_token intentionally absent — the documented replay edge case.
      },
    } as OrderCreateResponse;
    vi.mocked(ordersBackend.create).mockResolvedValue({ status: 201, body: backendBody });

    const response = await POST(makeRequest("key-3"));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.order_token_issued).toBe(true);
    expect(Object.hasOwn(json.data, "order_token")).toBe(false);
    expect(json.data.payment.client_secret).toBe("pi_456_secret_def");
    expect(setOrderToken).not.toHaveBeenCalled();
  });

  it("passes a non-201 response (e.g. a 422 validation error) through unchanged without touching the order-token cookie", async () => {
    const errorBody = {
      message: "The given data was invalid.",
      errors: { "address.suburb_id": ["The selected suburb_id is invalid."] },
    };
    vi.mocked(ordersBackend.create).mockResolvedValue({ status: 422, body: errorBody });

    const response = await POST(makeRequest("key-4"));
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json).toEqual(errorBody);
    expect(setOrderToken).not.toHaveBeenCalled();
  });
});
