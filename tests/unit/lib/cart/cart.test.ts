import { beforeEach, describe, expect, it } from "vitest";
import {
  EMPTY_CART,
  addItem,
  clearCartStorage,
  readCart,
  removeItem,
  toBookingItems,
  toCalculateItems,
  toggleAddon,
  updateQuantity,
  writeCart,
  type CartItem,
  type CartState,
} from "@/lib/cart/cart";

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    tyre_variant_id: 1,
    quantity: 4,
    position: "all",
    label: "Bridgestone Turanza T005 205/55 R16",
    slug: "bridgestone-turanza-t005-205-55-r16",
    ...overrides,
  };
}

describe("addItem", () => {
  it("adds a new row for a variant+position not already in the cart", () => {
    const next = addItem(EMPTY_CART, item());
    expect(next.items).toHaveLength(1);
    expect(next.items[0]).toEqual(item());
  });

  it("merges quantity into an existing row with the same variant+position", () => {
    const state = addItem(EMPTY_CART, item({ quantity: 4 }));
    const next = addItem(state, item({ quantity: 2 }));
    expect(next.items).toHaveLength(1);
    expect(next.items[0].quantity).toBe(6);
  });

  it("keeps front/rear rows for the same variant separate", () => {
    const state = addItem(EMPTY_CART, item({ position: "front", quantity: 2 }));
    const next = addItem(state, item({ position: "rear", quantity: 2 }));
    expect(next.items).toHaveLength(2);
  });
});

describe("updateQuantity / removeItem", () => {
  it("updates the quantity of the matching row only", () => {
    const state: CartState = { items: [item({ tyre_variant_id: 1 }), item({ tyre_variant_id: 2 })], addons: [] };
    const next = updateQuantity(state, { tyre_variant_id: 1, position: "all" }, 8);
    expect(next.items.find((i) => i.tyre_variant_id === 1)?.quantity).toBe(8);
    expect(next.items.find((i) => i.tyre_variant_id === 2)?.quantity).toBe(4);
  });

  it("removes the row when quantity drops to 0 or below", () => {
    const state: CartState = { items: [item()], addons: [] };
    const next = updateQuantity(state, { tyre_variant_id: 1, position: "all" }, 0);
    expect(next.items).toHaveLength(0);
  });

  it("removeItem drops only the matching variant+position", () => {
    const state: CartState = { items: [item({ position: "front" }), item({ position: "rear" })], addons: [] };
    const next = removeItem(state, { tyre_variant_id: 1, position: "front" });
    expect(next.items).toHaveLength(1);
    expect(next.items[0].position).toBe("rear");
  });
});

describe("toggleAddon", () => {
  it("adds an addon not yet selected, and removes it on a second toggle", () => {
    const withAddon = toggleAddon(EMPTY_CART, "alignment");
    expect(withAddon.addons).toEqual(["alignment"]);

    const withoutAddon = toggleAddon(withAddon, "alignment");
    expect(withoutAddon.addons).toEqual([]);
  });
});

describe("toBookingItems", () => {
  it("strips display-only fields down to the API's items[] shape", () => {
    const state: CartState = { items: [item({ tyre_variant_id: 7, quantity: 4, position: "all" })], addons: [] };
    expect(toBookingItems(state)).toEqual([{ tyre_variant_id: 7, quantity: 4, position: "all" }]);
  });
});

describe("toCalculateItems", () => {
  it("strips position and returns the cart/calculate mode 1 items[] shape", () => {
    const state: CartState = { items: [item({ tyre_variant_id: 7, quantity: 4, position: "all" })], addons: [] };
    expect(toCalculateItems(state)).toEqual([{ tyre_variant_id: 7, quantity: 4 }]);
  });

  it("merges front/rear rows of the same variant into one priced-line input", () => {
    const state: CartState = {
      items: [item({ tyre_variant_id: 7, quantity: 2, position: "front" }), item({ tyre_variant_id: 7, quantity: 2, position: "rear" })],
      addons: [],
    };
    expect(toCalculateItems(state)).toEqual([{ tyre_variant_id: 7, quantity: 4 }]);
  });
});

describe("readCart / writeCart (localStorage round-trip)", () => {
  beforeEach(() => {
    clearCartStorage();
  });

  it("returns EMPTY_CART when nothing has been stored", () => {
    expect(readCart()).toEqual(EMPTY_CART);
  });

  it("round-trips a written cart", () => {
    const state: CartState = { items: [item()], addons: ["alignment"] };
    writeCart(state);
    expect(readCart()).toEqual(state);
  });

  it("drops malformed rows rather than throwing", () => {
    window.localStorage.setItem("mts_cart", JSON.stringify({ items: [{ tyre_variant_id: "not-a-number" }], addons: ["staggered", "alignment"] }));
    const result = readCart();
    expect(result.items).toEqual([]);
    // `staggered` is never a customer-selectable addon key — filtered out.
    expect(result.addons).toEqual(["alignment"]);
  });

  it("returns EMPTY_CART for unparseable JSON", () => {
    window.localStorage.setItem("mts_cart", "{not json");
    expect(readCart()).toEqual(EMPTY_CART);
  });
});

describe("promo code on the cart (Phase 6b)", () => {
  it("normalises (trim, upper-case, 40 max) and stores the code without touching items", async () => {
    const { setPromoCode, normalisePromoCode } = await import("@/lib/cart/cart");
    expect(normalisePromoCode("  welcome10 ")).toBe("WELCOME10");
    expect(normalisePromoCode("x".repeat(60))).toHaveLength(40);

    const state = { items: [], addons: [] };
    expect(setPromoCode(state, " welcome10 ")).toEqual({ items: [], addons: [], promoCode: "WELCOME10" });
  });

  it("clears the code with null or a blank string", async () => {
    const { setPromoCode } = await import("@/lib/cart/cart");
    const withCode = { items: [], addons: [], promoCode: "WELCOME10" };
    expect(setPromoCode(withCode, null)).toEqual({ items: [], addons: [] });
    expect(setPromoCode(withCode, "   ")).toEqual({ items: [], addons: [] });
  });

  it("round-trips through localStorage, and survives other cart edits", async () => {
    const { setPromoCode, writeCart, readCart, addItem, EMPTY_CART } = await import("@/lib/cart/cart");
    const item = { tyre_variant_id: 1, quantity: 4, position: "all" as const, label: "A", slug: "a" };
    writeCart(addItem(setPromoCode(EMPTY_CART, "welcome10"), item));
    expect(readCart().promoCode).toBe("WELCOME10");
    expect(readCart().items).toHaveLength(1);
    window.localStorage.setItem("mts_cart", JSON.stringify({ items: [], addons: [], promoCode: 42 }));
    expect(readCart().promoCode).toBeUndefined();
  });
});
