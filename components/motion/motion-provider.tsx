"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig } from "framer-motion";

const loadFeatures = () => import("./features").then((mod) => mod.default);

/**
 * App-wide framer-motion setup: lazy-loaded DOM animation + layout features
 * (async chunk, off the critical path; use the `m.*` components, not
 * `motion.*`) and `reducedMotion="user"` so transform animations are skipped
 * for people who ask for less motion (framer-motion ignores the CSS
 * reduced-motion override in globals.css).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
