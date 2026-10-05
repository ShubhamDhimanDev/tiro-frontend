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
import { CartDrawerProvider, useCartDrawer } from "@/components/cart/cart-drawer";

function Opener() {
  const { openDrawer } = useCartDrawer();
  return <button onClick={openDrawer}>open cart</button>;
}

function renderDrawer() {
  return render(
    <CartProvider>
      <CartDrawerProvider>
        <Opener />
      </CartDrawerProvider>
    </CartProvider>,
  );
}

function seed() {
  localStorage.setItem(
    "mts_cart",
    JSON.stringify({ items: [{ tyre_variant_id: 1, quantity: 4, position: "all", label: "Brand Model 205/55 R16", slug: "brand-model" }], addons: [] }),
  );
}

const response = (flexible: boolean, extra: Record<string, unknown> = {}) => ({
  kind: "success",
  status: 200,
  data: {
    data: {
      subtotal: 75600,
      discount_total: flexible ? 1000 : 0,
      tax_total: 6000,
      service_fee_total: 0,
      grand_total: flexible ? 74600 : 75600,
      currency: "AUD",
      lines: [{ tyre_variant_id: 1, quantity: 4, unit_price: 18900, promotional_price: null, discount_amount: 0, tax_amount: 0, line_total: 75600, applied_promotion: null }],
      applied_promotions: [],
      discount_lines: flexible ? [{ type: "flexible", label: "Flexible booking discount", amount: 1000 }] : [],
      flexible_discount: flexible ? { label: "Flexible booking discount", amount: 1000 } : null,
      promo_error: null,
      ...extra,
    },
  },
});

describe("CartDrawer (live pricing)", () => {
  beforeEach(() => {
    localStorage.clear();
    calculateItems.mockReset();
    openPicker.mockReset();
    zone = { zoneId: "3", label: "Melbourne CBD Express" };
    calculateItems.mockImplementation(async (_z: string, _i: unknown, opts: { flexible?: boolean }) => response(Boolean(opts.flexible)));
  });

  it("shows the empty state with a shop link, without pricing anything", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await user.click(screen.getByRole("button", { name: "open cart" }));
    const dialog = screen.getByRole("dialog", { name: "My Cart" });
    expect(within(dialog).getByText(/currently empty/)).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Shop tyres now" })).toHaveAttribute("href", "/tyres");
    expect(calculateItems).not.toHaveBeenCalled();
  });

  it("does not call the pricing API while closed", async () => {
    seed();
    renderDrawer();
    await screen.findByRole("button", { name: "open cart" });
    await new Promise((r) => setTimeout(r, 450));
    expect(calculateItems).not.toHaveBeenCalled();
  });

  it("lists stored lines with the API's price and total, and the flexible toggle changes the total through the API", async () => {
    seed();
    const user = userEvent.setup();
    renderDrawer();
    await user.click(await screen.findByRole("button", { name: "open cart" }));
    const dialog = await screen.findByRole("dialog", { name: "My Cart" });
    expect(await within(dialog).findByRole("link", { name: "Brand Model" })).toHaveAttribute("href", "/tyres/brand-model");
    await waitFor(() => expect(within(dialog).getByTestId("cart-drawer-total")).toHaveTextContent("$756.00"));
    expect(within(dialog).getByText(/Onsite fitting, wheel balancing/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("checkbox", { name: /Flexible booking discount/ }));
    await waitFor(() => expect(within(dialog).getByTestId("cart-drawer-total")).toHaveTextContent("$746.00"));
    expect(within(dialog).getByRole("list", { name: "You saved" })).toHaveTextContent(/10.00/);
  });

  it("asks for a location when there is none, instead of showing a total", async () => {
    seed();
    zone = null;
    const user = userEvent.setup();
    renderDrawer();
    await user.click(await screen.findByRole("button", { name: "open cart" }));
    const dialog = await screen.findByRole("dialog", { name: "My Cart" });
    expect(within(dialog).getByTestId("cart-drawer-total")).toHaveTextContent("Set location");
    await user.click(within(dialog).getByRole("button", { name: "Set your location" }));
    expect(openPicker).toHaveBeenCalled();
  });
});
