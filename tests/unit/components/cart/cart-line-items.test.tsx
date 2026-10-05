import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CartLineItems } from "@/components/cart/cart-line-items";
import type { CartItem, CartState } from "@/lib/cart/cart";
import type { CartLine } from "@/lib/cart/types";

/**
 * Phase 5 promo-badge coverage for `<CartLineItems>` — per the task brief,
 * a green badge rendering `price.applied_promotion.name` next to a cart
 * line whenever that line's `CartLine.applied_promotion` (from
 * `POST /api/v1/cart/calculate`) is non-null, and nothing extra rendered
 * when it's null. No prior coverage of this component existed at all before
 * this file (it's one of this round's newly-landed, previously-untested
 * files per the dispatch).
 *
 * `useCart()` is mocked directly rather than wrapped in a real
 * `<CartProvider>` — this component only reads `state`/calls the mutator
 * callbacks it destructures, and the fixture below supplies both without
 * needing real localStorage hydration (which `<CartProvider>` defers to a
 * microtask on mount, an unnecessary complication for a test that only cares
 * about the `lines` prop / `applied_promotion` rendering).
 */
const mockUseCart = vi.fn();
vi.mock("@/components/cart/cart-provider", () => ({
  useCart: () => mockUseCart(),
}));

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    tyre_variant_id: 1,
    quantity: 1,
    position: "all",
    label: "Bridgestone Turanza T005 205/55 R16",
    slug: "bridgestone-turanza-t005-205-55-r16",
    ...overrides,
  };
}

function makeLine(overrides: Partial<CartLine> = {}): CartLine {
  return {
    tyre_variant_id: 1,
    quantity: 1,
    unit_price: 18900,
    promotional_price: null,
    discount_amount: 0,
    tax_amount: 1718,
    line_total: 18900,
    applied_promotion: null,
    ...overrides,
  };
}

function setCartState(state: CartState) {
  mockUseCart.mockReturnValue({
    state,
    setQuantity: vi.fn(),
    remove: vi.fn(),
    toggleAddonKey: vi.fn(),
  });
}

describe("CartLineItems — promotion badge", () => {
  it("renders a badge with the promotion's name when the matching line's applied_promotion is non-null", () => {
    setCartState({ items: [makeItem({ tyre_variant_id: 1 })], addons: [] });
    const lines = [makeLine({ tyre_variant_id: 1, applied_promotion: { id: 7, name: "Spring 10% off", type: "percentage" } })];

    render(<CartLineItems editable lines={lines} />);

    expect(screen.getByText("Spring 10% off")).toBeInTheDocument();
  });

  it("renders no badge at all when the matching line's applied_promotion is null", () => {
    setCartState({ items: [makeItem({ tyre_variant_id: 1 })], addons: [] });
    const lines = [makeLine({ tyre_variant_id: 1, applied_promotion: null })];

    render(<CartLineItems editable lines={lines} />);

    // No promotion name text anywhere, and specifically no badge
    // element — guards against a regression that renders an empty badge
    // shell instead of omitting it entirely.
    expect(screen.queryByTestId("line-promo-badge")).not.toBeInTheDocument();
  });

  it("in a multi-line cart, only the promoted line gets a badge — the other line stays unbadged", () => {
    setCartState({
      items: [makeItem({ tyre_variant_id: 1 }), makeItem({ tyre_variant_id: 2, label: "Michelin Primacy 4 215/55 R17", slug: "michelin-primacy-4-215-55-r17" })],
      addons: [],
    });
    const lines = [
      makeLine({ tyre_variant_id: 1, applied_promotion: { id: 7, name: "Spring 10% off", type: "percentage" } }),
      makeLine({ tyre_variant_id: 2, applied_promotion: null }),
    ];

    render(<CartLineItems editable lines={lines} />);

    expect(screen.getByText("Spring 10% off")).toBeInTheDocument();
    // Exactly one badge rendered in the whole list, not one per line.
    expect(screen.getAllByTestId("line-promo-badge")).toHaveLength(1);
  });

  it("renders no badge when there's no priced line at all for an item (lines=null, e.g. still loading)", () => {
    setCartState({ items: [makeItem({ tyre_variant_id: 1 })], addons: [] });

    render(<CartLineItems editable lines={null} />);

    expect(screen.queryByTestId("line-promo-badge")).not.toBeInTheDocument();
  });
});
