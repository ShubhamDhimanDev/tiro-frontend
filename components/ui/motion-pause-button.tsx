"use client";

import { useState } from "react";
import { cx } from "./cx";

/**
 * Pause / play control for auto-moving content (WCAG 2.2.2). Toggles
 * `data-paused` on the element with `targetId`; `[data-paused="true"]` in
 * globals.css freezes every CSS animation inside it. The control is a real
 * button with `aria-pressed`.
 */
export function MotionPauseButton({ targetId, label, className }: { targetId: string; label: string; className?: string }) {
  const [paused, setPaused] = useState(false);

  function toggle() {
    const next = !paused;
    setPaused(next);
    const target = document.getElementById(targetId);
    if (target) target.dataset.paused = String(next);
  }

  return (
    <button
      type="button"
      aria-pressed={paused}
      aria-label={`Pause ${label}`}
      onClick={toggle}
      className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-black transition-colors hover:bg-black/10", className)}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        {paused ? <path d="M8 5v14l11-7z" /> : <path d="M7 5h4v14H7zM13 5h4v14h-4z" />}
      </svg>
    </button>
  );
}
