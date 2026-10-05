import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/cart/calculate/route";
import { cartBackend } from "@/lib/cart/backend";
import { stubCartBackend } from "@/lib/cart/backend-stub";

vi.mock("@/lib/cart/backend", () => ({ cartBackend: { calculate: vi.fn() } }));
vi.mock("@/lib/auth/cookies", () => ({ getAuthToken: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/booking/manage-token-cookie", () => ({ getBookingManageToken: vi.fn().mockResolvedValue(null) }));

function post(body: unknown): Request {
  return new Request("http://localhost/api/cart/calculate", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

describe("POST /api/cart/calculate with promo_code and flexible", () => {
  beforeEach(() => vi.mocked(cartBackend.calculate).mockReset());

  it("forwards promo_code and flexible untouched and returns promo_error as a normal 200", async () => {
    const body = {
      data: {
        subtotal: 40000,
        discount_total: 0,
        grand_total: 40000,
        applied_promotions: [],
        discount_lines: [],
        flexible_discount: null,
        promo_error: { code: "promo_code_expired", message: "That promo code has expired." },
        lines: [],
      },
    };
    vi.mocked(cartBackend.calculate).mockResolvedValue({ status: 200, body });
    const input = { zone_id: "3", promo_code: "WELCOME10", flexible: true, items: [{ tyre_variant_id: 101, quantity: 2 }] };

    const res = await POST(post(input));

    expect(vi.mocked(cartBackend.calculate).mock.calls[0][0]).toEqual(input);
    expect(res.status).toBe(200);
    expect((await res.json()).data.promo_error).toEqual({ code: "promo_code_expired", message: "That promo code has expired." });
  });

  it("passes a 422 (code sent alongside booking_id) straight through", async () => {
    const body = { message: "The promo code field is prohibited.", errors: { promo_code: ["not allowed"] } };
    vi.mocked(cartBackend.calculate).mockResolvedValue({ status: 422, body });
    const res = await POST(post({ booking_id: 5, promo_code: "X" }));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual(body);
  });
});

describe("stub cart backend (Phase 6a shapes)", () => {
  const items = [{ tyre_variant_id: 101, quantity: 2 }];

  it("prices a valid code with a labelled line, source code and no promo_error", async () => {
    const res = await stubCartBackend.calculate({ zone_id: "1", items, promo_code: " welcome10 " });
    const data = (res.body as { data: Record<string, any> }).data; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.status).toBe(200);
    expect(data.promo_error).toBeNull();
    expect(data.discount_lines).toEqual([{ type: "promotion", label: "10% off your first order", amount: data.discount_total }]);
    expect(data.applied_promotions[0]).toMatchObject({ source: "code", code: "WELCOME10", amount: data.discount_total });
    expect(data.grand_total).toBe(data.subtotal - data.discount_total);
  });

  it("reports an unknown code as promo_error, priced without it", async () => {
    const res = await stubCartBackend.calculate({ zone_id: "1", items, promo_code: "NOPE" });
    const data = (res.body as { data: Record<string, any> }).data; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.status).toBe(200);
    expect(data.promo_error).toEqual({ code: "promo_code_invalid", message: expect.any(String) });
    expect(data.discount_total).toBe(0);
    expect(data.discount_lines).toEqual([]);
  });

  it("adds a labelled flexible discount line when flexible is previewed", async () => {
    const res = await stubCartBackend.calculate({ zone_id: "1", items, flexible: true });
    const data = (res.body as { data: Record<string, any> }).data; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(data.flexible_discount).toEqual({ label: "Flexible booking discount", amount: 1000 });
    expect(data.discount_lines).toEqual([{ type: "flexible", label: "Flexible booking discount", amount: 1000 }]);
    expect(data.grand_total).toBe(data.subtotal - 1000);
  });
});
