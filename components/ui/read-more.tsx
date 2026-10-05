"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * Collapsible text block ("Read more"). The full text is always in the DOM
 * (so it stays crawlable and readable without JS); collapsed it is clamped to
 * a few lines. The toggle is a real button with `aria-expanded`.
 */
export function ReadMore({
  children,
  className,
  moreLabel = "Read more",
  lessLabel = "Show less",
}: {
  children: ReactNode;
  className?: string;
  moreLabel?: string;
  lessLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();

  return (
    <div className={className}>
      <div id={id} className={cx("flex flex-col gap-3 text-muted", !expanded && "line-clamp-3")}>
        {children}
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded((v) => !v)}
        className="mt-1 inline-flex min-h-11 items-center font-semibold text-link underline underline-offset-4 hover:text-ink"
      >
        {expanded ? lessLabel : moreLabel}
      </button>
    </div>
  );
}
