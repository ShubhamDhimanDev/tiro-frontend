"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";
import { useCartDrawer } from "@/components/cart/cart-drawer";
import { m } from "framer-motion";
import { CartIcon } from "@/components/ui/icons";

/**
 * Header cart button: a 48px tile with an item-count badge. A plain click
 * opens the "My Cart" drawer; modified clicks (new tab) and no-JS fall through
 * to the `/cart` page. The accessible name carries the count.
 */
export function CartBadge() {
  const { itemCount } = useCart();
  const { openDrawer } = useCartDrawer();

  return (
    <Link
      href="/cart"
      aria-label={itemCount > 0 ? `Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}` : "Cart"}
      aria-haspopup="dialog"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        openDrawer();
      }}
      className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-chip text-black transition-colors duration-300 hover:bg-line"
    >
      <CartIcon className="h-6 w-6" />
      {/* Re-keyed on the count so each change replays a springy pop (the very first paint doesn't animate). */}
      {itemCount > 0 && (
      <m.span
        key={itemCount}
        aria-hidden="true"
        data-testid="cart-count"
        initial={{ scale: 1.6 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 18 }}
        className="type-mono absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-xs font-bold leading-none text-black"
      >
        {itemCount > 99 ? "99+" : itemCount}
      </m.span>
      )}
    </Link>
  );
}
