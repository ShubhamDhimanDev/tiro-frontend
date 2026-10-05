"use client";

import { useEffect } from "react";

/**
 * Marks the sticky site header with `data-scrolled="true"` once the page has
 * scrolled, so CSS (`.site-header` in globals.css) can add a shadow. Renders
 * nothing; the header itself stays a server component.
 */
export function HeaderScrollState() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('header[aria-label="Site header"]');
    if (!header) return;
    const update = () => {
      const y = window.scrollY;
      header.dataset.scrolled = y > 8 ? "true" : "false";
      // Desktop: slide the nav row away once well past the top (hysteresis so it never flickers).
      const collapsed = header.dataset.collapsed === "true";
      header.dataset.collapsed = collapsed ? (y < 40 ? "false" : "true") : y > 140 ? "true" : "false";
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return null;
}
