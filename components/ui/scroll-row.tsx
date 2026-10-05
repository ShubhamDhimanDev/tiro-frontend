"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * Horizontal scroller with soft edge fades that only show on the side that
 * still has content to reveal. Used for chip rows and the account sub-nav.
 * Native scrolling and keyboard focus scroll are untouched.
 */
export function ScrollRow({ children, className, innerClassName }: { children: ReactNode; className?: string; innerClassName?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  function measure() {
    const el = ref.current;
    if (!el) return;
    const start = el.scrollLeft > 4;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  const stops = [edges.start ? "transparent 0, #000 28px" : "#000 0", edges.end ? "#000 calc(100% - 28px), transparent 100%" : "#000 100%"];
  const mask = edges.start || edges.end ? `linear-gradient(to right, ${stops.join(", ")})` : undefined;

  return (
    <div
      ref={ref}
      onScroll={measure}
      data-edge-start={edges.start || undefined}
      data-edge-end={edges.end || undefined}
      style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      className={cx("-mx-1 overflow-x-auto overscroll-x-contain px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
    >
      <div className={cx("flex w-max min-w-full gap-2", innerClassName)}>{children}</div>
    </div>
  );
}
