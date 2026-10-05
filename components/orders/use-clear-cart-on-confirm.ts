"use client";

import { useCallback } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { clearStoredHold } from "@/lib/booking/hold-storage";
import { writeFittingSelection } from "@/lib/checkout/fitting-selection";
import { orderPhase } from "@/components/orders/order-status";
import type { OrderRecord } from "@/lib/orders/types";

const flagKey = (orderId: number) => `mts_order_purchase_cleared_${orderId}`;

/**
 * Once an order this browser placed is confirmed (paid), the purchase is over:
 * empty the cart, forget the fitting choice and the held-booking cache. Done
 * here, on the order page, rather than at "Pay", because some payment methods
 * leave and come back (Stripe redirects), and a failed payment must keep the
 * cart. It only fires for an order that has a checkout recap in this session
 * and only once per order, so looking at an old order while shopping never
 * empties the cart.
 */
export function useClearCartOnConfirm(): (order: OrderRecord) => void {
  const { clear } = useCart();
  return useCallback(
    (order: OrderRecord) => {
      if (orderPhase(order) !== "confirmed") return;
      try {
        if (!window.sessionStorage.getItem(`mts_order_recap_${order.id}`)) return;
        if (window.sessionStorage.getItem(flagKey(order.id))) return;
        window.sessionStorage.setItem(flagKey(order.id), "1");
      } catch {
        return;
      }
      clear();
      clearStoredHold();
      writeFittingSelection(null);
    },
    [clear],
  );
}
