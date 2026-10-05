import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CartTotalsSummary } from "@/components/cart/cart-totals";
import type { AppliedPromotionSummary, CartTotals } from "@/lib/cart/types";

/**
 * GST convention regression guard — docs/architecture/01-data-model.md's
 * "Money & tax convention" section: `tax_total` is informational/inclusive,
 * never additive. `grand_total` must never be computed/displayed as
 * `subtotal + tax_total`.
 *
 * Neither `tests/unit/lib/cart/cart.test.ts` (asserts `CartState`
 * item/addon logic only — never touches `CartTotals`/money rendering at
 * all) nor any other existing test actually asserted this at the frontend
 * rendering layer before this file — the docblock/JSX in
 * `components/cart/cart-totals.tsx` got it right, but nothing would have
 * failed if a later edit changed the "Total" row to `subtotal + tax_total`.
 * This uses fixture totals where `subtotal + tax_total !== grand_total`
 * specifically so that a naive additive "fix" would produce a different,
 * wrong dollar figure and fail these assertions.
 */
const totals: CartTotals = {
  subtotal: 40000, // $400.00
  discount_total: 0,
  tax_total: 3636, // $36.36 (informational GST component of subtotal, already included in it)
  service_fee_total: 0,
  grand_total: 40000, // $400.00 — same as subtotal, NOT subtotal + tax_total ($436.36)
  currency: "AUD",
};

describe("CartTotalsSummary — GST convention", () => {
  it("renders the Total row as grand_total, not subtotal + tax_total", () => {
    render(<CartTotalsSummary totals={totals} />);

    // Sanity: the two would differ if summed, so this fixture actually
    // exercises the bug this test is guarding against.
    expect(totals.subtotal + totals.tax_total).not.toBe(totals.grand_total);

    const totalRow = screen.getByText("Total").closest("div");
    expect(totalRow).toHaveTextContent("$400.00");
    expect(totalRow).not.toHaveTextContent("$436.36");
  });

  it("renders the GST helper line as an informational inclusion note, not a separate add-on charge", () => {
    render(<CartTotalsSummary totals={totals} />);

    expect(screen.getByText(/Includes \$36\.36 GST/)).toBeInTheDocument();
    expect(screen.getByText(/GST is not added on top of the total above/)).toBeInTheDocument();
  });

  it("Subtotal row shows the raw subtotal (unaffected by tax_total) even when discount/service fee are non-zero", () => {
    const totalsWithExtras: CartTotals = {
      subtotal: 40000,
      discount_total: 500,
      tax_total: 3636,
      service_fee_total: 1000,
      grand_total: 40500, // subtotal - discount_total + service_fee_total; still not + tax_total
      currency: "AUD",
    };
    render(<CartTotalsSummary totals={totalsWithExtras} />);

    const subtotalRow = screen.getByText("Subtotal").closest("div");
    expect(subtotalRow).toHaveTextContent("$400.00");

    const totalRow = screen.getByText("Total").closest("div");
    expect(totalRow).toHaveTextContent("$405.00");
    expect(totalRow).not.toHaveTextContent("$441.36"); // what a wrongly-additive total would show
  });
});

/**
 * Phase 5 `appliedPromotions` coverage — per the task brief: when
 * `totals.discount_total > 0` the "Discount" row label switches to "You
 * saved", and a per-promotion breakdown renders underneath *only* when
 * `appliedPromotions` is passed and non-empty. The order-confirmation page
 * (`<OrderStatusView>`) reuses this exact component but has no
 * `applied_promotions`-equivalent field on `OrderRecord`, so it omits the
 * prop entirely — that "still says 'You saved $X', just with no breakdown"
 * case is asserted explicitly below, not just assumed from the omitted-prop
 * case.
 */
describe("CartTotalsSummary — appliedPromotions (Phase 5)", () => {
  const discountedTotals: CartTotals = {
    subtotal: 40000,
    discount_total: 4000, // $40.00
    tax_total: 3300,
    service_fee_total: 0,
    grand_total: 36000,
    currency: "AUD",
  };

  const promotions: AppliedPromotionSummary[] = [
    { id: 1, name: "Spring 10% off", type: "percentage", discount_amount: 3000 },
    { id: 2, name: "4-for-3 special", type: "four_for_three", discount_amount: 1000 },
  ];

  it('switches the discount row label to "You saved" when discount_total > 0', () => {
    render(<CartTotalsSummary totals={discountedTotals} appliedPromotions={promotions} />);

    expect(screen.getByText("You saved")).toBeInTheDocument();
    expect(screen.queryByText("Discount")).not.toBeInTheDocument();

    const savedRow = screen.getByText("You saved").closest("div");
    expect(savedRow).toHaveTextContent("-$40.00");
  });

  it('keeps the "Discount" label (muted, not "You saved") when discount_total is 0, even if appliedPromotions is (incorrectly) non-empty', () => {
    const zeroDiscountTotals: CartTotals = { ...discountedTotals, discount_total: 0, grand_total: 40000 };
    render(<CartTotalsSummary totals={zeroDiscountTotals} appliedPromotions={promotions} />);

    expect(screen.getByText("Discount")).toBeInTheDocument();
    expect(screen.queryByText("You saved")).not.toBeInTheDocument();
    // No breakdown list either — the label switch and the breakdown are both
    // gated on hasSavings, not merely on appliedPromotions being present.
    expect(screen.queryByText("Spring 10% off")).not.toBeInTheDocument();
  });

  it("renders a per-promotion breakdown line (name + discount_amount) for every entry in appliedPromotions", () => {
    render(<CartTotalsSummary totals={discountedTotals} appliedPromotions={promotions} />);

    expect(screen.getByText("Spring 10% off")).toBeInTheDocument();
    expect(screen.getByText("-$30.00")).toBeInTheDocument();
    expect(screen.getByText("4-for-3 special")).toBeInTheDocument();
    expect(screen.getByText("-$10.00")).toBeInTheDocument();
  });

  it("shows \"You saved $X\" with no breakdown list when appliedPromotions is omitted (the order-confirmation page's OrderRecord has no equivalent field)", () => {
    render(<CartTotalsSummary totals={discountedTotals} />);

    const savedRow = screen.getByText("You saved").closest("div");
    expect(savedRow).toHaveTextContent("-$40.00");

    // No promotion names rendered anywhere — nothing to iterate over.
    expect(screen.queryByText("Spring 10% off")).not.toBeInTheDocument();
    expect(document.querySelector("ul")).not.toBeInTheDocument();
  });

  it("shows \"You saved $X\" with no breakdown list when appliedPromotions is explicitly an empty array despite a non-zero discount", () => {
    render(<CartTotalsSummary totals={discountedTotals} appliedPromotions={[]} />);

    const savedRow = screen.getByText("You saved").closest("div");
    expect(savedRow).toHaveTextContent("-$40.00");
    expect(document.querySelector("ul")).not.toBeInTheDocument();
  });
});
