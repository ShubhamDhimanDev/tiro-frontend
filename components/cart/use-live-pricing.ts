"use client";

import { useLocation } from "@/components/location/location-provider";
import { useCartPricing, type CartPricingState } from "@/components/cart/use-cart-pricing";

/**
 * Pricing for the current cart in the customer's current service zone.
 * `idle` covers "no zone yet" and "empty cart"; the caller decides whether to
 * ask for a location. This is the one hook the drawer, cart page and wizard
 * use, so they always agree.
 */
export function useLivePricing(opts: { flexible?: boolean } = {}): {
  pricing: CartPricingState;
  zoneId: string | null;
  zoneLoading: boolean;
  openPicker: () => void;
} {
  const { zone, loading, clearZone, openPicker } = useLocation();
  const zoneId = zone?.zoneId ?? null;
  const pricing = useCartPricing(zoneId, clearZone, opts);
  return { pricing, zoneId, zoneLoading: loading, openPicker };
}
