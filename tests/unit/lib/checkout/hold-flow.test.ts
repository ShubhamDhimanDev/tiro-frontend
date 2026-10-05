import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const show = vi.fn();
const cancel = vi.fn();
vi.mock("@/lib/booking/client-api", () => ({
  bookingApi: { create: (...a: unknown[]) => create(...a), show: (...a: unknown[]) => show(...a), cancel: (...a: unknown[]) => cancel(...a) },
}));

import { ensureHold, holdBody, type HeldBooking, type IdempotencyState } from "@/lib/checkout/hold-flow";

const items = [{ tyre_variant_id: 1, quantity: 4, position: "all" as const }];
const record = (over: Record<string, unknown> = {}) => ({
  id: 55,
  status: "pending_hold",
  scheduled_date: "2026-10-05",
  slot_start: "09:00",
  slot_end: "09:55",
  duration_minutes: 55,
  hold_expires_at: "2026-10-05T09:15:00+00:00",
  ...over,
});
const ok = (data: unknown) => ({ kind: "success", status: 200, data: { data } });

describe("holdBody", () => {
  it("sends the chosen slot, the promo code and the cart", () => {
    expect(holdBody({ zoneId: "3", fitting: { date: "2026-10-05", slot: "09:00", flexible: false }, items, addons: [], promoCode: "WELCOME10" })).toEqual({
      service_zone_id: "3",
      scheduled_date: "2026-10-05",
      slot_start: "09:00",
      promo_code: "WELCOME10",
      items,
      addons: [],
    });
  });

  it("sends flexible: true and no slot for the flexible option (the server assigns one)", () => {
    const body = holdBody({ zoneId: "3", fitting: { date: "2026-10-05", slot: null, flexible: true }, items, addons: ["alignment"] });
    expect(body).toMatchObject({ flexible: true, addons: ["alignment"] });
    expect(body).not.toHaveProperty("slot_start");
    expect(body).not.toHaveProperty("promo_code");
  });
});

describe("ensureHold", () => {
  let idem: IdempotencyState;
  const body = holdBody({ zoneId: "3", fitting: { date: "2026-10-05", slot: "09:00", flexible: false }, items, addons: [] });
  const bodyKey = JSON.stringify(body);

  beforeEach(() => {
    create.mockReset();
    show.mockReset();
    cancel.mockReset();
    idem = { bodyKey: null, key: null };
  });

  it("creates a hold with an Idempotency-Key and returns it", async () => {
    create.mockResolvedValue(ok(record()));
    const result = await ensureHold({ body, current: null, idempotency: idem });
    expect(result).toMatchObject({ kind: "ok", held: { record: { id: 55 }, bodyKey } });
    expect(create).toHaveBeenCalledWith(body, expect.stringMatching(/^[0-9a-f-]{36}$/));
  });

  it("reuses the same Idempotency-Key when the same request is retried, and a new one when it changes", async () => {
    create.mockResolvedValue({ kind: "unknown_error", status: 500, message: "x" });
    await ensureHold({ body, current: null, idempotency: idem });
    await ensureHold({ body, current: null, idempotency: idem });
    expect(create.mock.calls[0][1]).toBe(create.mock.calls[1][1]);
    await ensureHold({ body: { ...body, slot_start: "10:00" }, current: null, idempotency: idem });
    expect(create.mock.calls[2][1]).not.toBe(create.mock.calls[0][1]);
  });

  it("keeps an existing hold that is still pending for the same request (no second booking)", async () => {
    show.mockResolvedValue(ok(record()));
    const current: HeldBooking = { record: record() as never, bodyKey };
    const result = await ensureHold({ body, current, idempotency: idem });
    expect(result.kind).toBe("ok");
    expect(create).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("releases the old pending hold, then holds the new choice", async () => {
    show.mockResolvedValue(ok(record()));
    create.mockResolvedValue(ok(record({ id: 56 })));
    const current: HeldBooking = { record: record() as never, bodyKey: "something else" };
    const result = await ensureHold({ body, current, idempotency: idem });
    expect(cancel).toHaveBeenCalledWith(55);
    expect(result).toMatchObject({ kind: "ok", held: { record: { id: 56 } } });
  });

  it("never cancels a booking that is no longer a pending hold (for example a confirmed one)", async () => {
    show.mockResolvedValue(ok(record({ status: "confirmed" })));
    create.mockResolvedValue(ok(record({ id: 57 })));
    await ensureHold({ body, current: { record: record() as never, bodyKey }, idempotency: idem });
    expect(cancel).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
  });

  it("maps a taken slot, an unusable promo code and a lost flexible day to distinct results", async () => {
    create.mockResolvedValueOnce({ kind: "conflict", status: 409, message: "This slot is no longer available, please choose another." });
    expect(await ensureHold({ body, current: null, idempotency: idem })).toEqual({
      kind: "conflict",
      message: "This slot is no longer available, please choose another. Choose another time.",
    });
    create.mockResolvedValueOnce({ kind: "validation_error", status: 422, message: "m", errors: { promo_code: ["That promo code has expired."] } });
    expect(await ensureHold({ body, current: null, idempotency: idem })).toEqual({ kind: "promo", message: "That promo code has expired." });
    create.mockResolvedValueOnce({ kind: "validation_error", status: 422, message: "m", errors: { flexible: ["no"] } });
    expect((await ensureHold({ body, current: null, idempotency: idem })).kind).toBe("flexible");
    create.mockResolvedValueOnce({ kind: "not_found", status: 404, message: "no" });
    expect(await ensureHold({ body, current: null, idempotency: idem })).toEqual({ kind: "zone" });
  });

  it("does not replay a rejected attempt under the same key", async () => {
    create.mockResolvedValue({ kind: "conflict", status: 409, message: "gone" });
    await ensureHold({ body, current: null, idempotency: idem });
    expect(idem.key).toBeNull();
    await ensureHold({ body, current: null, idempotency: idem });
    expect(create.mock.calls[0][1]).not.toBe(create.mock.calls[1][1]);
  });
});
