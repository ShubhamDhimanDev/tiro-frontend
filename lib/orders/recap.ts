/**
 * Display-only recap of what the customer entered at checkout, kept in
 * sessionStorage so the confirmation page can show the tyres and address the
 * order API doesn't return (its `line_items` only carry variant ids and its
 * booking summary has no address). Never authoritative and never sent
 * anywhere: if it is missing (another device, a new session) the confirmation
 * simply shows less.
 */
export interface OrderRecap {
  bookingId: number;
  /** "12 Example St, Richmond VIC 3121" */
  address?: string;
  tyres: Array<{ tyre_variant_id: number; label: string; quantity: number; image?: string }>;
}

const key = (orderId: number | string) => `mts_order_recap_${orderId}`;

export function saveOrderRecap(orderId: number | string, recap: OrderRecap): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key(orderId), JSON.stringify(recap));
  } catch {
    // Ignore: display cache only.
  }
}

export function readOrderRecap(orderId: number | string): OrderRecap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key(orderId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OrderRecap>;
    if (typeof parsed.bookingId !== "number" || !Array.isArray(parsed.tyres)) return null;
    return {
      bookingId: parsed.bookingId,
      address: typeof parsed.address === "string" ? parsed.address : undefined,
      tyres: parsed.tyres.filter(
        (t): t is OrderRecap["tyres"][number] =>
          typeof t?.tyre_variant_id === "number" && typeof t?.label === "string" && typeof t?.quantity === "number",
      ),
    };
  } catch {
    return null;
  }
}
