import type { Transition, Variants } from "framer-motion";

/** Mirrors `--motion-*` / `--ease-out-soft` in app/globals.css (seconds, not ms). */
export const DUR = { fast: 0.15, base: 0.3, slow: 0.4 } as const;
export const EASE = [0.2, 0, 0, 1] as const;

export const tween = (duration: number = DUR.base): Transition => ({ duration, ease: EASE });

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: tween() },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: tween(DUR.slow) },
};

/** Gentler reveal for content that may sit above the fold (results grids): never below 0.85 opacity so a stalled observer / full-page capture never looks disabled. */
export const softUp: Variants = {
  hidden: { opacity: 0.85, y: 12 },
  visible: { opacity: 1, y: 0, transition: tween(DUR.base) },
};

/** Parent variant: staggers children (`fadeUp`/`fadeIn`). Cap at ~6 children for the delay to stay unnoticeable. */
export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
