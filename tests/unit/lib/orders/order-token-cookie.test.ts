import { describe, expect, it, vi, beforeEach } from "vitest";
import { cookies } from "next/headers";
import { setOrderToken, getOrderToken } from "@/lib/orders/order-token-cookie";

/**
 * `lib/orders/order-token-cookie.ts` is documented (its own docblock, and
 * `frontend/CLAUDE.md`'s Phase 4 section) as "a near-verbatim copy of
 * `lib/booking/manage-token-cookie.ts`, retargeted at `Order`/`order_token`"
 * — this file mirrors `tests/unit/lib/booking/manage-token-cookie.test.ts`'s
 * coverage shape exactly, applied to the order-token module. Two differences
 * from that template, both reflecting real API differences rather than
 * oversights:
 *  - there is no `clearOrderToken` export (no equivalent "cancel a booking"
 *    terminal-state trigger exists for orders in this phase), so there's no
 *    clear-round-trip section here;
 *  - this suite additionally asserts the 1-day TTL (`maxAge`) explicitly,
 *    which the booking template itself never pinned down numerically — the
 *    qa-lead's Phase 4 sign-off pass asked for it directly since a silent
 *    regression to a much shorter/longer TTL would still pass the template's
 *    own `toMatchObject` checks.
 */
function createMockCookieStore() {
  const raw = new Map<string, string>();
  return {
    get: vi.fn((name: string) => (raw.has(name) ? { name, value: raw.get(name)! } : undefined)),
    set: vi.fn<(name: string, value: string, options?: Record<string, unknown>) => void>((name, value) => {
      raw.set(name, value);
    }),
    raw,
  };
}

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

describe("order-token-cookie", () => {
  let store: ReturnType<typeof createMockCookieStore>;

  beforeEach(() => {
    store = createMockCookieStore();
    vi.mocked(cookies).mockResolvedValue(store as unknown as Awaited<ReturnType<typeof cookies>>);
  });

  describe("set/get round-trip", () => {
    it("stores and retrieves a single order's token", async () => {
      await setOrderToken(501, "order-tok-501");
      await expect(getOrderToken(501)).resolves.toBe("order-tok-501");
    });

    it("writes the cookie httpOnly, matching the Sanctum token cookie's own handling", async () => {
      await setOrderToken(501, "order-tok-501");
      const [, , options] = store.set.mock.calls[0];
      expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    });

    it("sets a 1-day (86400s) maxAge on the cookie", async () => {
      await setOrderToken(501, "order-tok-501");
      const [, , options] = store.set.mock.calls[0] as [string, string, Record<string, unknown>];
      expect(options.maxAge).toBe(60 * 60 * 24);
    });
  });

  describe("multiple orders coexisting in the same cookie", () => {
    it("setOrderToken merges a new order in rather than overwriting the map", async () => {
      await setOrderToken(1, "tok-1");
      await setOrderToken(2, "tok-2");
      await expect(getOrderToken(1)).resolves.toBe("tok-1");
      await expect(getOrderToken(2)).resolves.toBe("tok-2");
    });

    it("updating one order's token leaves a sibling order's token untouched", async () => {
      await setOrderToken(1, "tok-1");
      await setOrderToken(2, "tok-2");
      await setOrderToken(1, "tok-1-updated");
      await expect(getOrderToken(1)).resolves.toBe("tok-1-updated");
      await expect(getOrderToken(2)).resolves.toBe("tok-2");
    });
  });

  describe("malformed cookie value", () => {
    it("falls back to an empty map instead of throwing when the cookie holds unparseable JSON", async () => {
      // Learn the real cookie name from a genuine write rather than
      // hardcoding it (keeps this test decoupled from the module's private
      // cookie-name constant), then corrupt the stored value directly.
      await setOrderToken(1, "tok-1");
      const cookieName = store.set.mock.calls[0][0] as string;
      store.raw.set(cookieName, "{not json");

      await expect(getOrderToken(1)).resolves.toBeNull();
    });

    it("still accepts new writes after the cookie previously held malformed JSON", async () => {
      await setOrderToken(1, "tok-1");
      const cookieName = store.set.mock.calls[0][0] as string;
      store.raw.set(cookieName, "{not json");

      await setOrderToken(2, "tok-2");
      await expect(getOrderToken(2)).resolves.toBe("tok-2");
    });

    it("treats valid JSON that isn't a plain object (e.g. an array) as an empty map too", async () => {
      await setOrderToken(1, "tok-1");
      const cookieName = store.set.mock.calls[0][0] as string;
      store.raw.set(cookieName, JSON.stringify([1, 2, 3]));

      await expect(getOrderToken(1)).resolves.toBeNull();
    });
  });

  describe("missing/unknown cookie or order id", () => {
    it("getOrderToken returns null, not undefined or a throw, when the cookie was never set", async () => {
      await expect(getOrderToken(999)).resolves.toBeNull();
    });

    it("returns null for an id that isn't in the map even when other orders are present", async () => {
      await setOrderToken(1, "tok-1");
      await expect(getOrderToken(2)).resolves.toBeNull();
    });

    it("normalizes a numeric id and its string equivalent to the same key", async () => {
      await setOrderToken(5, "tok-5");
      await expect(getOrderToken("5")).resolves.toBe("tok-5");
    });
  });
});
