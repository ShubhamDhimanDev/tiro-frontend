import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const show = vi.fn();
vi.mock("@/lib/orders/client-api", () => ({ ordersApi: { show: (...a: unknown[]) => show(...a) } }));
vi.mock("@/components/auth/auth-provider", () => ({ useAuth: () => ({ customer: null }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { OrderPageView } from "@/components/orders/order-page";
import { CartProvider } from "@/components/cart/cart-provider";

const renderPage = (orderId = 8000) =>
  render(
    <CartProvider>
      <OrderPageView orderId={orderId} />
    </CartProvider>,
  );

const order = (over: Record<string, unknown> = {}) => ({
  id: 8000,
  order_number: "TMS-20260930-7091",
  status: "confirmed",
  payment_status: "paid",
  subtotal: 40000,
  discount_total: 1000,
  tax_total: 3545,
  service_fee_total: 0,
  grand_total: 39000,
  currency: "AUD",
  flexible_discount: { label: "Flexible booking discount", amount: 1000 },
  line_items: [],
  booking: null,
  ...over,
});

describe("OrderPageView heading", () => {
  beforeEach(() => show.mockReset());

  it("says Your order until the order loads", async () => {
    let resolve: (v: unknown) => void = () => {};
    show.mockReturnValue(new Promise((r) => (resolve = r)));
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName("Your order");
    resolve({ kind: "not_found", status: 404, message: "no" });
    await screen.findByTestId("order-load-problem");
  });

  it("becomes 'Order <number>' with 'Your order' as the eyebrow once loaded", async () => {
    show.mockResolvedValue({ kind: "success", status: 200, data: { data: order() } });
    renderPage();
    // the accessible name the e2e spec looks for: `Order ${orderNumber}`
    expect(await screen.findByRole("heading", { level: 1, name: "Order TMS-20260930-7091" })).toBeInTheDocument();
    expect(screen.getByText("Your order")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("keeps 'Your order' when the order can't be loaded", async () => {
    show.mockResolvedValue({ kind: "not_found", status: 404, message: "no" });
    renderPage();
    await screen.findByTestId("order-load-problem");
    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName("Your order");
  });

  it("shows the labelled flexible discount line in the payment summary", async () => {
    show.mockResolvedValue({ kind: "success", status: 200, data: { data: order() } });
    renderPage();
    const line = await screen.findByTestId("flexible-discount-line");
    expect(line).toHaveTextContent("Flexible booking discount");
    expect(line).toHaveTextContent("-$10.00");
  });
});
