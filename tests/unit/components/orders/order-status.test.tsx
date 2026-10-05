import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderStatusView, orderPhase, PREP_CHECKLIST } from "@/components/orders/order-status";
import type { OrderRecord } from "@/lib/orders/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/auth/auth-provider", () => ({ useAuth: () => ({ customer: null }) }));

const show = vi.fn();
vi.mock("@/lib/orders/client-api", () => ({ ordersApi: { show: (...a: unknown[]) => show(...a) } }));

function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: 8000,
    order_number: "TMS-STUB-8000",
    status: "confirmed",
    payment_status: "paid",
    currency: "AUD",
    subtotal: 75600,
    discount_total: 0,
    tax_total: 6873,
    service_fee_total: 0,
    grand_total: 75600,
    line_items: [{ tyre_variant_id: 101, quantity: 4, unit_price: 18900, discount_amount: 0, tax_amount: 6873, line_total: 75600 }],
    booking: { scheduled_date: "2026-10-02", slot_start: "09:00", slot_end: "09:52" },
    ...overrides,
  };
}

function respondWith(o: OrderRecord) {
  show.mockResolvedValue({ kind: "success", status: 200, data: { data: o } });
}

describe("orderPhase", () => {
  it("maps statuses to confirmation states", () => {
    expect(orderPhase({ status: "confirmed", payment_status: "paid" })).toBe("confirmed");
    expect(orderPhase({ status: "pending_payment", payment_status: "pending" })).toBe("pending");
    expect(orderPhase({ status: "payment_failed", payment_status: "failed" })).toBe("failed");
    expect(orderPhase({ status: "cancelled", payment_status: "refunded" })).toBe("closed");
  });
});

describe("OrderStatusView", () => {
  beforeEach(() => {
    show.mockReset();
    window.sessionStorage.clear();
  });

  it("shows the success state with order number, slot window, checklist and calendar button", async () => {
    respondWith(order());
    render(<OrderStatusView orderId={8000} />);
    expect(await screen.findByTestId("order-confirmed")).toHaveTextContent("You're booked in");
    expect(screen.getByTestId("order-number")).toHaveTextContent("TMS-STUB-8000");
    expect(screen.getByText("Friday 2 October 2026")).toBeInTheDocument();
    expect(screen.getByText("Technician window")).toBeInTheDocument();
    expect(screen.getByText("9:00 – 9:52 am")).toBeInTheDocument();
    for (const item of PREP_CHECKLIST) expect(screen.getByText(item)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add to calendar/ })).toBeInTheDocument();
    // no recap in this session: change by phone, not a dead button
    expect(screen.getByText(/change or cancel your booking/)).toBeInTheDocument();
  });

  it("offers Manage booking when the checkout recap is available", async () => {
    window.sessionStorage.setItem(
      "mts_order_recap_8000",
      JSON.stringify({
        bookingId: 5000,
        address: "12 Example St, Richmond VIC 3121",
        tyres: [{ tyre_variant_id: 101, label: "Bridgestone Turanza T005 205/55 R16", quantity: 4 }],
      }),
    );
    respondWith(order());
    render(<OrderStatusView orderId={8000} />);
    expect(await screen.findByRole("button", { name: "Manage booking" })).toBeInTheDocument();
    expect(screen.getByText("12 Example St, Richmond VIC 3121")).toBeInTheDocument();
    expect(screen.getByText("Bridgestone Turanza T005")).toBeInTheDocument();
  });

  it("shows a pending state without the checklist while payment is confirmed", async () => {
    respondWith(order({ status: "pending_payment", payment_status: "pending" }));
    render(<OrderStatusView orderId={8000} />);
    expect(await screen.findByTestId("order-pending")).toHaveTextContent("Confirming your payment");
    expect(screen.queryByText("Before we arrive")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh status" })).toBeInTheDocument();
  });

  it("shows a failed state with a way to recover", async () => {
    respondWith(order({ status: "payment_failed", payment_status: "failed" }));
    render(<OrderStatusView orderId={8000} />);
    expect(await screen.findByTestId("order-failed")).toHaveTextContent("Your payment didn't go through");
    expect(screen.getByRole("link", { name: "Back to cart" })).toHaveAttribute("href", "/cart");
  });

  it("explains a forbidden order and offers sign in and the phone number", async () => {
    show.mockResolvedValue({ kind: "forbidden", status: 403, message: "no" });
    render(<OrderStatusView orderId={8000} />);
    expect(await screen.findByTestId("order-load-problem")).toHaveTextContent("We can't show this order here");
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });

  it("lets the customer retry after a load error", async () => {
    show.mockResolvedValue({ kind: "unknown_error", status: 500, message: "Something went wrong." });
    render(<OrderStatusView orderId={8000} />);
    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
