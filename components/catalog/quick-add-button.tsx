"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { DEFAULT_QUANTITY } from "@/lib/catalog/price";
import type { BookingPosition } from "@/lib/booking/types";

/**
 * "Add" button on a results card. Uses the same cart flow as the PDP
 * (`useCart().add`), with the default quantity for the position: 4 for a full
 * set, 2 for a front or rear axle pair. Quantity can be changed in the cart.
 */
export function QuickAddButton({
  tyreVariantId,
  slug,
  label,
  image,
  position = "all",
  disabled = false,
}: {
  tyreVariantId: number;
  slug: string;
  label: string;
  image?: string;
  position?: BookingPosition;
  disabled?: boolean;
}) {
  const { add } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  function handleAdd() {
    add({ tyre_variant_id: tyreVariantId, quantity: DEFAULT_QUANTITY[position], position, label, slug, image });
    setJustAdded(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setJustAdded(false), 2500);
  }

  return (
    <>
      <Button
        size="sm"
        onClick={handleAdd}
        disabled={disabled}
        aria-label={`Add ${label} to cart`}
        className="relative z-10 min-w-[4.5rem] px-4"
        data-testid="quick-add"
      >
        <AnimatePresence mode="wait" initial={false}>
          {justAdded ? (
            <m.span
              key="added"
              className="inline-flex items-center gap-1.5"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
            >
              <CheckIcon aria-hidden="true" className="h-4 w-4" />
              Added
            </m.span>
          ) : (
            <m.span key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
              Add
            </m.span>
          )}
        </AnimatePresence>
      </Button>
      <span role="status" className="sr-only">
        {justAdded ? `${label} added to cart (${DEFAULT_QUANTITY[position]} tyres)` : ""}
      </span>
    </>
  );
}
