import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const calculateItems = vi.fn();
vi.mock("@/lib/cart/client-api", () => ({ cartApi: { calculateItems: (...a: unknown[]) => calculateItems(...a) } }));

let zone: { zoneId: string; label: string } | null = { zoneId: "3", label: "Melbourne CBD Express" };
const openPicker = vi.fn();
vi.mock("@/components/location/location-provider", () => ({
  useLocation: () => ({ zone, loading: false, clearZone: vi.fn(), openPicker }),
}));

import { CartProvider } from "@/components/cart/cart-provider";
import { CartPageView } from "@/components/cart/cart-page-view";
import { TierPicks } from "@/components/catalog/tier-picks";
import { groupTyresByModel } from "@/lib/catalog/group-by-model";
import { deriveTiers } from "@/lib/catalog/tiers";
import type { TyreListItem } from "@/lib/catalog/types";

function seed(quantity = 4) {
  localStorage.setItem(
    "mts_cart",
    JSON.stringify({
      items: [{ tyre_variant_id: 101, quantity, position: "all", label: "Bridgestone Turanza T005 205/55 R16", slug: "turanza" }],
      addons: [],
    }),
  );
}

/** A priced response shaped like `POST /cart/calculate` (cents). */
function priced(quantity: number, extra: Record<string, unknown> = {}, opts: { flexible?: boolean } = {}) {
  const subtotal = 18900 * quantity;
  const flex = opts.flexible ? 1000 : 0;
  return {
    kind: "success",
    status: 200,
    data: {
      data: {
        subtotal,
        discount_total: flex,
        tax_total: 1000,
        service_fee_total: 0,
        grand_total: subtotal - flex,
        currency: "AUD",
        lines: [
          { tyre_variant_id: 101, quantity, unit_price: 18900, promotional_price: null, discount_amount: 0, tax_amount: 0, line_total: subtotal, applied_promotion: null },
        ],
        applied_promotions: [],
        discount_lines: flex ? [{ type: "flexible", label: "Flexible booking discount", amount: flex }] : [],
        flexible_discount: flex ? { label: "Flexible booking discount", amount: flex } : null,
        promo_error: null,
        ...extra,
      },
    },
  };
}

function renderCart() {
  return render(
    <CartProvider>
      <CartPageView />
    </CartProvider>,
  );
}

describe("CartPageView (live pricing)", () => {
  beforeEach(() => {
    localStorage.clear();
    calculateItems.mockReset();
    openPicker.mockReset();
    zone = { zoneId: "3", label: "Melbourne CBD Express" };
    calculateItems.mockImplementation(async (_zone: string, items: { quantity: number }[], opts: { flexible?: boolean }) =>
      priced(items[0].quantity, {}, opts),
    );
  });

  it("shows the empty state with a shop link", async () => {
    renderCart();
    const empty = await screen.findByTestId("cart-empty");
    expect(within(empty).getByRole("link", { name: "Shop tyres now" })).toHaveAttribute("href", "/tyres");
    expect(calculateItems).not.toHaveBeenCalled();
  });

  it("shows prices from the API, not from anything stored on the line", async () => {
    // A stale price hint on the stored line must never reach the screen.
    localStorage.setItem(
      "mts_cart",
      JSON.stringify({
        items: [{ tyre_variant_id: 101, quantity: 4, position: "all", label: "Bridgestone Turanza T005 205/55 R16", slug: "turanza", unit_cents: 99 }],
        addons: [],
      }),
    );
    renderCart();
    const total = await screen.findByTestId("cart-total");
    await waitFor(() => expect(total).toHaveTextContent("$756.00"));
    expect(screen.getByText("$189.00 each")).toBeInTheDocument();
    expect(screen.queryByText(/\$0\.99/)).toBeNull();
    expect(calculateItems).toHaveBeenCalledWith("3", [{ tyre_variant_id: 101, quantity: 4 }], { promoCode: null, flexible: false });
  });

  it("re-prices through the API when the quantity changes", async () => {
    seed();
    const user = userEvent.setup();
    renderCart();
    await waitFor(() => expect(screen.getByTestId("cart-total")).toHaveTextContent("$756.00"));
    await user.click(screen.getByRole("button", { name: /Decrease quantity for Bridgestone Turanza T005/ }));
    await waitFor(() => expect(screen.getByTestId("cart-total")).toHaveTextContent("$567.00"));
    expect(screen.getAllByRole("link", { name: "Checkout" })[0]).toHaveAttribute("href", "/checkout");
  });

  it("the flexible toggle is sent to the API and its discount is the API's number", async () => {
    seed();
    const user = userEvent.setup();
    renderCart();
    await waitFor(() => expect(screen.getByTestId("cart-total")).toHaveTextContent("$756.00"));
    await user.click(screen.getByRole("checkbox", { name: /Flexible booking discount/ }));
    await waitFor(() => expect(screen.getByTestId("cart-total")).toHaveTextContent("$746.00"));
    expect(screen.getByTestId("flexible-discount-line")).toHaveTextContent("-$10.00");
    expect(calculateItems).toHaveBeenLastCalledWith("3", [{ tyre_variant_id: 101, quantity: 4 }], { promoCode: null, flexible: true });
  });

  it("a code the API rejects shows the API's message under the field", async () => {
    seed();
    calculateItems.mockImplementation(async (_z: string, items: { quantity: number }[]) =>
      priced(items[0].quantity, { promo_error: { code: "promo_code_expired", message: "That promo code has expired." } }),
    );
    const user = userEvent.setup();
    renderCart();
    await waitFor(() => expect(screen.getByTestId("cart-total")).toHaveTextContent("$756.00"));
    await user.type(screen.getByLabelText("Promo code"), "old10");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText("That promo code has expired.")).toBeInTheDocument();
    expect(screen.queryByTestId("promo-applied")).toBeNull();
    expect(calculateItems).toHaveBeenLastCalledWith("3", [{ tyre_variant_id: 101, quantity: 4 }], { promoCode: "OLD10", flexible: false });
  });

  it("an accepted code shows as applied", async () => {
    seed();
    const user = userEvent.setup();
    renderCart();
    await waitFor(() => expect(screen.getByTestId("cart-total")).toHaveTextContent("$756.00"));
    await user.type(screen.getByLabelText("Promo code"), "welcome10");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByTestId("promo-applied")).toHaveTextContent("WELCOME10");
  });

  it("without a location it shows the lines and asks for one instead of a price", async () => {
    seed();
    zone = null;
    const user = userEvent.setup();
    renderCart();
    expect(await screen.findByRole("link", { name: "Bridgestone Turanza T005" })).toBeInTheDocument();
    expect(screen.queryByTestId("cart-total")).toBeNull();
    expect(calculateItems).not.toHaveBeenCalled();
    await user.click(within(screen.getByTestId("cart-location-prompt")).getByRole("button", { name: "Set your location" }));
    expect(openPicker).toHaveBeenCalled();
  });

  it("an API failure says so and keeps the lines", async () => {
    seed();
    calculateItems.mockResolvedValue({ kind: "unknown_error", status: 500, message: "We couldn't complete that just now." });
    renderCart();
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't complete that just now.");
    expect(screen.getByRole("link", { name: "Bridgestone Turanza T005" })).toBeInTheDocument();
  });

  it("removes a line", async () => {
    seed();
    const user = userEvent.setup();
    renderCart();
    await user.click(await screen.findByRole("button", { name: /Remove/ }));
    expect(screen.getByTestId("cart-empty")).toBeInTheDocument();
  });
});

describe("TierPicks columns", () => {
  function tyre(id: number, name: string): TyreListItem {
    return {
      id,
      slug: `t-${id}`,
      sku: `S${id}`,
      width: 205,
      profile: 55,
      rim_diameter: 16,
      load_index: "91",
      speed_rating: "V",
      sidewall: "standard",
      tyre_model: {
        id,
        slug: `m-${id}`,
        name,
        brand: { id, name: `Brand${id}`, slug: `b-${id}`, logo_path: null, country_of_origin: null },
        category: "car",
        tyre_type: "highway",
        images: [],
      },
    };
  }

  it("renders Premium, Mid-range and Budget columns, each with a card", () => {
    const groups = groupTyresByModel(
      [tyre(1, "Alpha"), tyre(2, "Beta"), tyre(3, "Gamma"), tyre(4, "Delta")].map((t, i) => ({ ...t, list_price: 12000 + i * 6000 })),
    );
    const picks = deriveTiers(groups)!.picks;
    render(
      <CartProvider>
        <TierPicks picks={picks} sizeLabel="205/55 R16" size={{ width: "205", profile: "55", rim: "16" }} />
      </CartProvider>,
    );
    expect(screen.getByRole("heading", { name: "Top picks for 205/55 R16" })).toBeInTheDocument();
    for (const tier of ["premium", "mid", "budget"]) {
      expect(within(screen.getByTestId(`tier-pick-${tier}`)).getAllByTestId("tyre-card")).toHaveLength(1);
    }
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("Mid-range")).toBeInTheDocument();
    expect(screen.getByText("Budget")).toBeInTheDocument();
    expect(screen.getByText("R16")).toBeInTheDocument();
  });
});
