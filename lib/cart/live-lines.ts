import type { CartItem } from "@/lib/cart/cart";
import type { CartLine } from "@/lib/cart/types";

/**
 * Matches a cart row to the line `cart/calculate` priced for it. The API
 * prices per variant (front/rear rows of one variant are merged into one
 * line, see `toCalculateItems`), so a row's own total is computed from that
 * line: the line's `line_total` (after its discount) when the row is the whole
 * line, else `unit price x the row's quantity`.
 */
export interface RowPrice {
  /** Price of one tyre before any discount, cents. */
  unit: number;
  /** What this row costs after the line's discount, cents. */
  total: number;
  /** Name of the promotion applied to this line, if any. */
  promotion: string | null;
}

export function rowPrice(lines: CartLine[] | null | undefined, item: Pick<CartItem, "tyre_variant_id" | "quantity">): RowPrice | null {
  const line = lines?.find((l) => l.tyre_variant_id === item.tyre_variant_id);
  if (!line) return null;
  const whole = line.quantity === item.quantity;
  return {
    unit: line.unit_price,
    total: whole ? line.line_total : line.unit_price * item.quantity,
    promotion: line.applied_promotion?.name ?? null,
  };
}
