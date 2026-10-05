"use client";

import { AnimatePresence, m } from "framer-motion";

/**
 * Text that slides/fades in whenever its value changes (prices, totals).
 * `initial={false}` on the presence skips the first paint, and the span has
 * no `exit`, so the old value is dropped at once and the DOM never holds two
 * prices at the same time.
 */
export function PriceTick({ value, className }: { value: string; className?: string }) {
  return (
    <AnimatePresence initial={false}>
      <m.span
        key={value}
        className={className}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        style={{ display: "inline-block" }}
      >
        {value}
      </m.span>
    </AnimatePresence>
  );
}
