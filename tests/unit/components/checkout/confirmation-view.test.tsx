import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const show = vi.fn();
vi.mock("@/lib/orders/client-api", () => ({ ordersApi: { show: (...a: unknown[]) => show(...a) } }));
vi.mock("@/components/auth/auth-provider", () => ({ useAuth: () => ({ customer: null }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { CartProvider } from "@/components/cart/cart-provider";
import { ConfirmationView } from "@/components/checkout/confirmation-view";
import { HOLD_STORAGE_KEY } from "@/lib/booking/hold-storage";

const order = (over: Record<string, unknown> = {}) => ({
  id: 900,
  order_number: "TMS-20261001-0001",
  status: "confirmed",
  payment_status: "paid",
  subtotal: 75600,
  discount_total: 0,
  tax_total: 6873,
  service_fee_total: 0,
  grand_total: 75600,
  currency: "AUD",
  flexible_discount: null,
  line_items: [{ tyre_variant_id: 101, quantity: 4, unit_price: 18900, discount_amount: 0, tax_amount: 6873, line_total: 75600 }],
  booking: { scheduled_date: "2026-10-05", slot_start: "09:00", slot_end: "09:55" },
  ...over,
});

function renderView(orderId: number | null = 900) {
  return render(
    <CartProvider>
      <ConfirmationView orderId={orderId} />
    </CartProvider>,
  );
}

function seedPurchase({ recap }: { recap: boolean }) {
  localStorage.setItem("mts_cart", JSON.stringify({ items: [{ tyre_variant_id: 101, quantity: 4, position: "all", label: "Bridgestone Turanza T005 205/55 R16", slug: "t" }], addons: [] }));
  localStorage.setItem("mts_fitting_selection_v2", JSON.stringify({ date: "2026-10-05", slot: "09:00", flexible: false }));
  sessionStorage.setItem(HOLD_STORAGE_KEY, JSON.stringify({ id: 55 }));
  if (recap) {
    sessionStorage.setItem(
      "mts_order_recap_900",
      JSON.stringify({ bookingId: 55, address: "12 Example St, Richmond VIC 3121", tyres: [{ tyre_variant_id: 101, label: "Bridgestone Turanza T005 205/55 R16", quantity: 4 }] }),
    );
  }
}

describe("ConfirmationView (real order)", () => {
  beforeEach(() => {
    show.mockReset();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("explains when it is opened without an order", () => {
    renderView(null);
    expect(screen.getByText("No order to show")).toBeInTheDocument();
    expect(show).not.toHaveBeenCalled();
  });

  it("shows the order from the API, and after a confirmed purchase empties the cart, the fitting choice and the hold cache", async () => {
    seedPurchase({ recap: true });
    show.mockResolvedValue({ kind: "success", status: 200, data: { data: order() } });
    renderView();
    expect(await screen.findByTestId("order-confirmed")).toHaveTextContent("You're booked in");
    expect(screen.getByRole("heading", { name: "Order TMS-20261001-0001" })).toBeInTheDocument();
    expect(screen.getByText("12 Example St, Richmond VIC 3121")).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem("mts_cart")).toBeNull());
    expect(localStorage.getItem("mts_fitting_selection_v2")).toBeNull();
    expect(sessionStorage.getItem(HOLD_STORAGE_KEY)).toBeNull();
  });

  it("does not touch the cart for an order this browser did not just place", async () => {
    seedPurchase({ recap: false });
    show.mockResolvedValue({ kind: "success", status: 200, data: { data: order() } });
    renderView();
    await screen.findByTestId("order-confirmed");
    expect(localStorage.getItem("mts_cart")).not.toBeNull();
  });

  it("keeps the cart while payment is pending or has failed", async () => {
    seedPurchase({ recap: true });
    show.mockResolvedValue({ kind: "success", status: 200, data: { data: order({ status: "payment_failed", payment_status: "failed" }) } });
    renderView();
    await screen.findByTestId("order-failed");
    expect(localStorage.getItem("mts_cart")).not.toBeNull();
  });

  it("says plainly when the order cannot be shown here", async () => {
    show.mockResolvedValue({ kind: "forbidden", status: 403, message: "no" });
    renderView();
    expect(await screen.findByTestId("order-load-problem")).toHaveTextContent("We can't show this order here");
  });
});
