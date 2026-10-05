"use client";

import { clampQuantity, MAX_QUANTITY, MIN_QUANTITY } from "@/lib/catalog/price";
import { m } from "framer-motion";
import { cx } from "./cx";

/**
 * Quantity control with 44px minus / plus buttons around an editable number.
 * Values are clamped to 1-20 (the range the cart accepts).
 */
export function QuantityStepper({
  value,
  onChange,
  label = "Quantity",
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  label?: string;
  className?: string;
}) {
  const button =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-xl font-semibold leading-none text-ink transition-colors hover:bg-chip disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-surface";

  return (
    <div role="group" aria-label={label} className={cx("inline-flex items-center gap-2", className)}>
      <m.button
        whileTap={{ scale: 0.9 }}
        type="button"
        aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={value <= MIN_QUANTITY}
        onClick={() => onChange(clampQuantity(value - 1))}
        className={button}
      >
        <span aria-hidden="true">&minus;</span>
      </m.button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        min={MIN_QUANTITY}
        max={MAX_QUANTITY}
        value={value}
        onChange={(e) => onChange(clampQuantity(Number(e.target.value)))}
        className="h-11 w-14 rounded-control border border-line bg-surface text-center font-mono text-base font-semibold text-ink [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <m.button
        whileTap={{ scale: 0.9 }}
        type="button"
        aria-label={`Increase ${label.toLowerCase()}`}
        disabled={value >= MAX_QUANTITY}
        onClick={() => onChange(clampQuantity(value + 1))}
        className={button}
      >
        <span aria-hidden="true">+</span>
      </m.button>
    </div>
  );
}
