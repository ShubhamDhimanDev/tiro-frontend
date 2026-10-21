import type { StockStatus } from "@/lib/catalog/types";

/**
 * palette tokens: green dot for in-stock, yellow dot (black ring) for low/limited
 * stock (urgency), grey dot for
 * out-of-stock/unavailable. Labels are unchanged text (asserted verbatim by
 * `tests/e2e/catalog/pdp.spec.ts`/`search.spec.ts` — "In stock"/"Limited
 * stock"/"Out of stock"/"Not available in your area") — only the visual
 * treatment (dot + text instead of a filled pill) changed.
 */
const STOCK_META: Record<StockStatus, { label: string; dotClassName: string; textClassName: string }> = {
  in_stock: { label: "In stock", dotClassName: "bg-green", textClassName: "text-green" },
  limited: { label: "Limited stock", dotClassName: "bg-gold ring-1 ring-black", textClassName: "text-black" },
  out_of_stock: { label: "Out of stock", dotClassName: "bg-steel", textClassName: "text-muted" },
  unavailable_in_zone: { label: "Not available in your area", dotClassName: "bg-steel", textClassName: "text-muted" },
};

/** Shared between search/browse cards and the PDP availability section. */
export function StockBadge({ status }: { status: StockStatus }) {
  const { label, dotClassName, textClassName } = STOCK_META[status];
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 text-xs font-semibold ${textClassName}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClassName}`} aria-hidden="true" />
      {label}
    </span>
  );
}
