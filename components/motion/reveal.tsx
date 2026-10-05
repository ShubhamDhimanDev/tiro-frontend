"use client";

import type { ReactNode } from "react";
import { m } from "framer-motion";
import { fadeUp, softUp, stagger } from "./variants";

const VIEWPORT = { once: true, margin: "0px 0px 200px 0px" } as const;

/**
 * Fade-up once when scrolled into view. Below-the-fold content only: never
 * wrap LCP content (hero heading / finder), it starts at opacity 0. Use
 * `soft` for content that may already be on screen (starts at 0.85 opacity).
 */
export function Reveal({ children, className, soft = false }: { children: ReactNode; className?: string; soft?: boolean }) {
  return (
    <m.div className={className} variants={soft ? softUp : fadeUp} initial="hidden" whileInView="visible" viewport={VIEWPORT}>
      {children}
    </m.div>
  );
}

/** Staggers its `<RevealItem>` children when scrolled into view. */
export function RevealList({
  children,
  className,
  as = "div",
  label,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol";
  label?: string;
}) {
  const Tag = m[as];
  return (
    <Tag className={className} aria-label={label} variants={stagger} initial="hidden" whileInView="visible" viewport={VIEWPORT}>
      {children}
    </Tag>
  );
}

export function RevealItem({
  children,
  className,
  id,
  as = "div",
  soft = false,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: "div" | "li";
  soft?: boolean;
}) {
  const Tag = m[as];
  return (
    <Tag className={className} id={id} variants={soft ? softUp : fadeUp}>
      {children}
    </Tag>
  );
}
