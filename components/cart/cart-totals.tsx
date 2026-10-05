import { PriceTick } from "@/components/motion/price-tick";
import { formatMoney } from "@/lib/catalog/format-money";
import type { AppliedPromotionSummary, CartTotals, DiscountLine, FlexibleDiscount } from "@/lib/cart/types";

/**
 * The labelled rows under "You saved". Prefers the API's `discount_lines`;
 * falls back to `applied_promotions` (labelled by `label`, else `name`) plus the
 * flexible discount for callers that only have those (older responses, orders).
 * Nothing here computes an amount.
 */
export function buildDiscountLines(input: {
  discountLines?: DiscountLine[];
  appliedPromotions?: AppliedPromotionSummary[];
  flexibleDiscount?: FlexibleDiscount | null;
}): DiscountLine[] {
  if (input.discountLines && input.discountLines.length > 0) return input.discountLines;
  const lines: DiscountLine[] = (input.appliedPromotions ?? []).map((p) => ({
    type: "promotion" as const,
    label: p.label ?? p.name,
    amount: p.amount ?? p.discount_amount,
  }));
  if (input.flexibleDiscount) lines.push({ type: "flexible", label: input.flexibleDiscount.label, amount: input.flexibleDiscount.amount });
  return lines;
}

/**
 * Renders every field `cart/calculate` returns: `subtotal`/`discount_total`/
 * `tax_total`/`service_fee_total`/`grand_total`. `tax_total` is an informational
 * breakdown ("includes $X GST"), never added to reach the total; see
 * docs/architecture/01-data-model.md's "Money & tax convention" section. The
 * service fee row only shows when it is non-zero (it is a flat 0 today).
 *
 * `appliedPromotions` is optional: only `cart/calculate`'s response carries it
 * (`OrderRecord` on the confirmation page does not). When present and non-empty
 * the discount row reads "You saved" and each auto-applied promotion gets its
 * own labelled line under it, straight from `name`/`discount_amount`. Nothing
 * here computes a discount; it only formats what the server already summed.
 *
 * Markup contract used by tests: rows are `div > dt + dd`; the promotion lines
 * are `dl li`; there is no `ul` at all when there is nothing to list.
 */
export function CartTotalsSummary({
  totals,
  appliedPromotions,
  discountLines,
  flexibleDiscount,
  label = "Order summary",
  hideHeading = false,
}: {
  totals: CartTotals;
  appliedPromotions?: AppliedPromotionSummary[];
  /** Phase 6a flat list; takes priority over `appliedPromotions`. */
  discountLines?: DiscountLine[];
  /** Phase 6a order/cart-level flexible discount; shown as its own labelled line. */
  flexibleDiscount?: FlexibleDiscount | null;
  label?: string;
  hideHeading?: boolean;
}) {
  const hasSavings = totals.discount_total > 0;
  const lines = buildDiscountLines({ discountLines, appliedPromotions, flexibleDiscount });
  const showPromos = hasSavings && lines.length > 0;

  return (
    <div className="flex flex-col gap-3 text-sm">
      {!hideHeading && <h2 className="type-h3">{label}</h2>}
      <dl className="flex flex-col gap-2">
        <Row label="Subtotal" value={formatMoney(totals.subtotal, totals.currency)} />
        <Row
          label={hasSavings ? "You saved" : "Discount"}
          value={hasSavings ? `-${formatMoney(totals.discount_total, totals.currency)}` : formatMoney(0, totals.currency)}
          muted={!hasSavings}
          savings={hasSavings}
        />
        {showPromos && (
          <div>
            <dt className="sr-only">Discounts applied</dt>
            <dd>
              <ul className="flex flex-col gap-1 rounded-control bg-gold-soft/60 px-3 py-2 text-xs text-ink">
                {lines.map((line, index) => (
                  <li key={`${line.type}-${index}`} data-testid={line.type === "flexible" ? "flexible-discount-line" : undefined} className="flex items-center justify-between gap-3">
                    <span>{line.label}</span>
                    <span className="font-mono font-semibold">-{formatMoney(line.amount, totals.currency)}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        {totals.service_fee_total > 0 && (
          <Row label="Service fee" value={formatMoney(totals.service_fee_total, totals.currency)} />
        )}
        <div className="my-1 border-t border-line" />
        <Row label="Total" value={formatMoney(totals.grand_total, totals.currency)} emphasis />
      </dl>
      <p className="text-xs text-muted">
        Includes {formatMoney(totals.tax_total, totals.currency)} GST. All prices shown are GST-inclusive; GST is not added on top of the total above.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  emphasis,
  savings,
}: {
  label: string;
  value: string;
  muted?: boolean;
  emphasis?: boolean;
  savings?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={emphasis ? "text-base font-bold text-ink" : "text-muted"}>{label}</dt>
      <dd
        className={
          emphasis
            ? "font-mono text-xl font-bold text-ink"
            : savings
              ? "font-mono font-semibold text-success"
              : muted
                ? "font-mono text-muted"
                : "font-mono text-ink"
        }
      >
        {emphasis ? <PriceTick value={value} /> : value}
      </dd>
    </div>
  );
}
