"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { cartApi, type CartApiResult } from "@/lib/cart/client-api";
import { toCalculateItems } from "@/lib/cart/cart";
import type { CartCalculateData } from "@/lib/cart/types";

/**
 * Debounce window between a cart edit (quantity change) and the next
 * `cart/calculate` call. The contract says "re-sent on every quantity
 * change"; every settled change still gets a fresh call, just not one per
 * keystroke. Judgment call, not specified by the contract.
 */
export const CALCULATE_DEBOUNCE_MS = 350;

export type CartPricingState =
  /** No zone yet, or nothing in the cart: there is nothing to price. */
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string; retry: () => void }
  | { status: "ready"; data: CartCalculateData };

type CalcResult = CartApiResult<{ data: CartCalculateData }>;

/**
 * Calls made for the same request key within the same moment share one
 * network request: the cart drawer, the cart page and the checkout wizard can
 * all be mounted together and each asks for the same price.
 */
const inflight = new Map<string, Promise<CalcResult>>();

function calculateOnce(key: string, run: () => Promise<CalcResult>): Promise<CalcResult> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = run().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

/**
 * Live pricing for the current cart (`POST /api/v1/cart/calculate`, mode 1):
 * per-line prices, auto-applied and code promotions, the flexible-booking
 * discount, GST and the total. Everything shown on cart surfaces comes from
 * this; the client never computes a price.
 *
 * The promo code and the flexible preference come from the cart state. Pass
 * `opts.flexible` to override the preference (the booking page previews the
 * option the customer is looking at).
 *
 * Keyed by zone + items + code + flexible rather than reset with a
 * synchronous setState in the effect: "loading" for a new key is derived by
 * comparing keys.
 */
export function useCartPricing(
  zoneId: string | null,
  onZoneRejected: () => Promise<void> | void,
  opts: { flexible?: boolean } = {},
): CartPricingState {
  const { state } = useCart();
  const items = toCalculateItems(state);
  const itemsKey = JSON.stringify(items);
  const promoCode = state.promoCode ?? null;
  const flexible = opts.flexible ?? Boolean(state.flexible);
  const active = Boolean(zoneId) && items.length > 0;
  const [retryCount, setRetryCount] = useState(0);
  const requestKey = `${zoneId ?? ""}::${itemsKey}::${promoCode ?? ""}::${flexible}::${retryCount}`;

  const [result, setResult] = useState<{ key: string; state: CartPricingState } | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!active || !zoneId) return;

    const seq = ++requestSeq.current;

    const timer = window.setTimeout(() => {
      calculateOnce(requestKey, () => cartApi.calculateItems(zoneId, items, { promoCode, flexible })).then((apiResult) => {
        if (seq !== requestSeq.current) return; // A newer edit superseded this call.

        if (apiResult.kind === "success") {
          setResult({ key: requestKey, state: { status: "ready", data: apiResult.data.data } });
          return;
        }
        if (apiResult.kind === "not_found") {
          // Stale/tampered zone id: degrade to "re-check serviceability".
          void onZoneRejected();
          return;
        }
        setResult({ key: requestKey, state: { status: "error", message: apiResult.message, retry: () => setRetryCount((n) => n + 1) } });
      });
    }, CALCULATE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on requestKey (a stable stringified snapshot) rather than the items array reference, which is a new array every render.
  }, [active, zoneId, requestKey, onZoneRejected, promoCode, flexible]);

  if (!active) return { status: "idle" };
  return result && result.key === requestKey ? result.state : { status: "loading" };
}
