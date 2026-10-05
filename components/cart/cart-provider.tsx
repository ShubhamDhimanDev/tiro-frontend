"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import type { BookingAddonKey, BookingPosition } from "@/lib/booking/types";
import {
  EMPTY_CART,
  addItem,
  clearCartStorage,
  readCart,
  removeItem,
  setFlexible as applyFlexible,
  setPromoCode as applyPromoCode,
  toggleAddon,
  updateQuantity,
  writeCart,
  type CartItem,
  type CartState,
} from "@/lib/cart/cart";

interface CartItemKey {
  tyre_variant_id: number;
  position: BookingPosition;
}

interface CartContextValue {
  state: CartState;
  /** False until the first localStorage read has landed (so pages can avoid flashing an empty cart). */
  hydrated: boolean;
  itemCount: number;
  add: (item: CartItem) => void;
  setQuantity: (key: CartItemKey, quantity: number) => void;
  remove: (key: CartItemKey) => void;
  toggleAddonKey: (addon: BookingAddonKey) => void;
  /** Set the promo code to send with pricing and booking, or pass null to remove it. */
  setPromoCode: (code: string | null) => void;
  /** Turn the flexible-booking discount preference on or off. */
  setFlexible: (flexible: boolean) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Root-level cart context — supersedes Phase 3's
 * `components/booking/selection-provider.tsx` (deleted this round; see
 * `lib/cart/cart.ts`'s doc comment for why this is a rename/promotion, not a
 * new mechanism). Same hydration rationale as `<LocationProvider>`/
 * `<AuthProvider>`: this project's `cacheComponents` flag is off, so this
 * hydrates client-side on mount rather than reading storage synchronously
 * during a render shared with SSG/ISR pages. Source of truth is
 * `localStorage`, not an httpOnly cookie — there's still no server-side cart
 * entity to mirror (Phase 4's contract confirms this is permanent, not a gap
 * left for a later phase to close).
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>(EMPTY_CART);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Deferred to a microtask for the same lint-rule reason
    // `selection-provider.tsx` documented before it — see that file's git
    // history / `<LocationProvider>`'s equivalent comment.
    queueMicrotask(() => {
      setState(readCart());
      setHydrated(true);
    });
  }, []);

  const toast = useToast();
  const add = useCallback(
    (item: CartItem) => {
      setState((prev) => {
        const next = addItem(prev, item);
        writeCart(next);
        return next;
      });
      toast.show({ message: `${item.quantity} ${item.quantity === 1 ? "tyre" : "tyres"} in your cart`, actionHref: "/cart", actionLabel: "View cart" });
    },
    [toast],
  );

  const setQuantity = useCallback((key: CartItemKey, quantity: number) => {
    setState((prev) => {
      const next = updateQuantity(prev, key, quantity);
      writeCart(next);
      return next;
    });
  }, []);

  const remove = useCallback((key: CartItemKey) => {
    setState((prev) => {
      const next = removeItem(prev, key);
      writeCart(next);
      return next;
    });
  }, []);

  const toggleAddonKey = useCallback((addon: BookingAddonKey) => {
    setState((prev) => {
      const next = toggleAddon(prev, addon);
      writeCart(next);
      return next;
    });
  }, []);

  const setPromoCode = useCallback((code: string | null) => {
    setState((prev) => {
      const next = applyPromoCode(prev, code);
      writeCart(next);
      return next;
    });
  }, []);

  const setFlexible = useCallback((flexible: boolean) => {
    setState((prev) => {
      if (Boolean(prev.flexible) === flexible) return prev;
      const next = applyFlexible(prev, flexible);
      writeCart(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    clearCartStorage();
    setState(EMPTY_CART);
  }, []);

  const itemCount = useMemo(() => state.items.reduce((sum, item) => sum + item.quantity, 0), [state.items]);

  const value = useMemo(
    () => ({ state, hydrated, itemCount, add, setQuantity, remove, toggleAddonKey, setPromoCode, setFlexible, clear }),
    [state, hydrated, itemCount, add, setQuantity, remove, toggleAddonKey, setPromoCode, setFlexible, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within <CartProvider>");
  }
  return ctx;
}
