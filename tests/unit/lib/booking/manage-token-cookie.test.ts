import { describe, expect, it, vi, beforeEach } from "vitest";
import { cookies } from "next/headers";
import {
  setBookingManageToken,
  getBookingManageToken,
  clearBookingManageToken,
} from "@/lib/booking/manage-token-cookie";

/**
 * `lib/booking/manage-token-cookie.ts` reads/writes exclusively through
 * Next's `cookies()` (a Promise-returning, server-only API — no test for
 * `lib/auth/cookies.ts`, the file this module's own docblock says it
 * mirrors, exists yet to copy a pattern from). This fake reproduces only
 * the two methods the module actually calls, `get`/`set`, backed by a
 * plain `Map` so a `set` in one call is visible to a `get` in the next
 * within the same test — exactly like the real per-request cookie jar,
 * without pulling in a full Next.js request/response cycle.
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

describe("manage-token-cookie", () => {
  let store: ReturnType<typeof createMockCookieStore>;

  beforeEach(() => {
    store = createMockCookieStore();
    vi.mocked(cookies).mockResolvedValue(store as unknown as Awaited<ReturnType<typeof cookies>>);
  });

  describe("set/get/clear round-trip", () => {
    it("stores and retrieves a single booking's token", async () => {
      await setBookingManageToken(101, "tok-101");
      await expect(getBookingManageToken(101)).resolves.toBe("tok-101");
    });

    it("writes the cookie httpOnly, matching the Sanctum token cookie's own handling", async () => {
      await setBookingManageToken(101, "tok-101");
      const [, , options] = store.set.mock.calls[0];
      expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    });

    it("clearBookingManageToken removes the entry so a later get returns null", async () => {
      await setBookingManageToken(101, "tok-101");
      await clearBookingManageToken(101);
      await expect(getBookingManageToken(101)).resolves.toBeNull();
    });
  });

  describe("multiple bookings coexisting in the same cookie", () => {
    it("setBookingManageToken merges a new booking in rather than overwriting the map", async () => {
      await setBookingManageToken(1, "tok-1");
      await setBookingManageToken(2, "tok-2");
      await expect(getBookingManageToken(1)).resolves.toBe("tok-1");
      await expect(getBookingManageToken(2)).resolves.toBe("tok-2");
    });

    it("updating one booking's token leaves a sibling booking's token untouched", async () => {
      await setBookingManageToken(1, "tok-1");
      await setBookingManageToken(2, "tok-2");
      await setBookingManageToken(1, "tok-1-updated");
      await expect(getBookingManageToken(1)).resolves.toBe("tok-1-updated");
      await expect(getBookingManageToken(2)).resolves.toBe("tok-2");
    });

    it("clearBookingManageToken removes only the targeted booking's entry", async () => {
      await setBookingManageToken(1, "tok-1");
      await setBookingManageToken(2, "tok-2");
      await clearBookingManageToken(1);
      await expect(getBookingManageToken(1)).resolves.toBeNull();
      await expect(getBookingManageToken(2)).resolves.toBe("tok-2");
    });
  });

  describe("malformed cookie value", () => {
    it("falls back to an empty map instead of throwing when the cookie holds unparseable JSON", async () => {
      // Learn the real cookie name from a genuine write rather than
      // hardcoding it (keeps this test decoupled from the module's private
      // cookie-name constant), then corrupt the stored value directly.
      await setBookingManageToken(1, "tok-1");
      const cookieName = store.set.mock.calls[0][0] as string;
      store.raw.set(cookieName, "{not json");

      await expect(getBookingManageToken(1)).resolves.toBeNull();
    });

    it("still accepts new writes after the cookie previously held malformed JSON", async () => {
      await setBookingManageToken(1, "tok-1");
      const cookieName = store.set.mock.calls[0][0] as string;
      store.raw.set(cookieName, "{not json");

      await setBookingManageToken(2, "tok-2");
      await expect(getBookingManageToken(2)).resolves.toBe("tok-2");
    });

    it("treats valid JSON that isn't a plain object (e.g. an array) as an empty map too", async () => {
      await setBookingManageToken(1, "tok-1");
      const cookieName = store.set.mock.calls[0][0] as string;
      store.raw.set(cookieName, JSON.stringify([1, 2, 3]));

      await expect(getBookingManageToken(1)).resolves.toBeNull();
    });
  });

  describe("unknown booking id", () => {
    it("getBookingManageToken returns null, not undefined or a throw, when nothing has ever been stored", async () => {
      await expect(getBookingManageToken(999)).resolves.toBeNull();
    });

    it("returns null for an id that isn't in the map even when other bookings are present", async () => {
      await setBookingManageToken(1, "tok-1");
      await expect(getBookingManageToken(2)).resolves.toBeNull();
    });

    it("normalizes a numeric id and its string equivalent to the same key", async () => {
      await setBookingManageToken(5, "tok-5");
      await expect(getBookingManageToken("5")).resolves.toBe("tok-5");
    });
  });
});
