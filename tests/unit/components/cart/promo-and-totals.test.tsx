import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromoCodeForm } from "@/components/cart/promo-code-form";
import { CartTotalsSummary, buildDiscountLines } from "@/components/cart/cart-totals";

const totals = { subtotal: 40000, discount_total: 5000, tax_total: 3182, service_fee_total: 0, grand_total: 35000, currency: "AUD" };

describe("PromoCodeForm", () => {
  it("asks for a code before applying, with an accessible error", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<PromoCodeForm code={undefined} pricing="ready" promoError={undefined} onApply={onApply} onRemove={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Apply" }));
    const input = screen.getByLabelText("Promo code");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(input.getAttribute("aria-describedby")!)).toHaveTextContent("Enter a promo code.");
    expect(input).toHaveFocus();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("applies a trimmed, upper-cased code", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<PromoCodeForm code={undefined} pricing="ready" promoError={undefined} onApply={onApply} onRemove={vi.fn()} />);
    await user.type(screen.getByLabelText("Promo code"), "  welcome10 ");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith("WELCOME10");
  });

  it("shows the API's promo_error message under the field, puts the code back and focuses it", async () => {
    render(
      <PromoCodeForm
        code="OLDCODE"
        pricing="ready"
        promoError={{ code: "promo_code_expired", message: "That promo code has expired." }}
        onApply={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const input = screen.getByLabelText("Promo code");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(input.getAttribute("aria-describedby")!)).toHaveTextContent("That promo code has expired.");
    await waitFor(() => expect(input).toHaveValue("OLDCODE"));
    await waitFor(() => expect(input).toHaveFocus());
    expect(screen.getByRole("button", { name: "Remove OLDCODE" })).toBeInTheDocument();
  });

  it("shows an applied chip with Remove once the server accepts the code", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<PromoCodeForm code="WELCOME10" pricing="ready" promoError={null} onApply={vi.fn()} onRemove={onRemove} />);
    expect(screen.getByTestId("promo-applied")).toHaveTextContent("WELCOME10 applied");
    await user.click(screen.getByRole("button", { name: "Remove promo code WELCOME10" }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("disables the field while a new code is being priced", () => {
    render(<PromoCodeForm code="NEW" pricing="loading" promoError={undefined} onApply={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByLabelText("Promo code")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Applying" })).toBeDisabled();
  });
});

describe("labelled discount lines", () => {
  it("renders discount_lines, including the flexible line, under You saved", () => {
    render(
      <CartTotalsSummary
        totals={totals}
        discountLines={[
          { type: "promotion", label: "10% off your first order", amount: 4000 },
          { type: "flexible", label: "Flexible booking discount", amount: 1000 },
        ]}
      />,
    );
    const lines = document.querySelectorAll("dl li");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveTextContent("10% off your first order");
    expect(lines[0]).toHaveTextContent("-$40.00");
    expect(screen.getByTestId("flexible-discount-line")).toHaveTextContent("Flexible booking discount");
    expect(screen.getByTestId("flexible-discount-line")).toHaveTextContent("-$10.00");
    expect(screen.getByText("You saved")).toBeInTheDocument();
  });

  it("falls back to applied promotions (label, else name) plus the order-level flexible discount", () => {
    expect(
      buildDiscountLines({
        appliedPromotions: [
          { id: 1, name: "Internal name", type: "percentage", discount_amount: 4000, label: "10% off", amount: 4000, source: "code", code: "W" },
          { id: 2, name: "Other", type: "percentage", discount_amount: 100 },
        ],
        flexibleDiscount: { label: "Flexible booking discount", amount: 1000 },
      }),
    ).toEqual([
      { type: "promotion", label: "10% off", amount: 4000 },
      { type: "promotion", label: "Other", amount: 100 },
      { type: "flexible", label: "Flexible booking discount", amount: 1000 },
    ]);
  });

  it("shows only the flexible line on an order summary that has just the flexible discount", () => {
    render(<CartTotalsSummary totals={{ ...totals, discount_total: 1000 }} flexibleDiscount={{ label: "Flexible booking discount", amount: 1000 }} label="Payment summary" />);
    expect(document.querySelectorAll("dl li")).toHaveLength(1);
    expect(screen.getByText("Payment summary")).toBeInTheDocument();
  });

  it("shows no lines when nothing was saved", () => {
    render(<CartTotalsSummary totals={{ ...totals, discount_total: 0 }} discountLines={[]} />);
    expect(document.querySelectorAll("dl li")).toHaveLength(0);
  });
});
