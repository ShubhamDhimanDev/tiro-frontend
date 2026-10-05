"use client";

import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m } from "framer-motion";
import { tween, DUR } from "@/components/motion/variants";
import { cx } from "./cx";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Several sheets can be open at once (e.g. a dialog over a sheet); the body
// stays locked until the last one closes.
let lockCount = 0;
let savedOverflow = "";

function lockScroll() {
  if (lockCount++ === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
}
function unlockScroll() {
  if (--lockCount === 0) document.body.style.overflow = savedOverflow;
}

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  /** Visible heading; also the dialog's accessible name. */
  title: string;
  children: ReactNode;
  /** Desktop (>=768px) presentation. Phones always get a bottom sheet. */
  desktop?: "dialog" | "side";
  /**
   * `"drawer"`: a full-height panel sliding in from the left at every width
   * (site menu). Overrides the bottom-sheet-on-phones behaviour.
   * `"drawer-right"`: cart drawer, a full-height right-hand panel on tablet+
   * and a bottom sheet on phones.
   */
  presentation?: "responsive" | "drawer" | "drawer-right";
  /** Footer slot pinned below the scrolling body (e.g. Apply / Clear). */
  footer?: ReactNode;
  /** Wider centred dialog on tablet+ (850px, location modal). */
  wide?: boolean;
  /** Replaces the default body padding (`px-5 py-4`), e.g. `p-0` for edge-to-edge panels. */
  bodyClassName?: string;
  /** `"dark"` gives a black header with white title (cart drawer). */
  headerTone?: "light" | "dark";
  /** Test hook / extra id on the dialog panel. */
  panelTestId?: string;
  /** Close when the scrim is clicked. Default true. */
  dismissOnScrim?: boolean;
  /**
   * Replaces the default header (title + close button). Receives the id the
   * dialog is labelled by (put it on the heading) and the close handler.
   * Additive: omit it and nothing changes.
   */
  renderHeader?: (args: { titleId: string; close: () => void }) => ReactNode;
  /**
   * Where focus lands when the sheet opens. `"first"` (default): the first
   * focusable control (usually Close). `"panel"`: the dialog panel itself
   * (named by the title), so no control shows a focus ring on open; Tab still
   * reaches every control and stays trapped inside.
   */
  initialFocus?: "first" | "panel";
  className?: string;
};

/**
 * Bottom sheet on phones, centred dialog or right-hand side panel on desktop.
 * Modal: traps focus, closes on Escape / scrim / close button, locks page
 * scroll, and returns focus to whatever opened it.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  desktop = "dialog",
  presentation = "responsive",
  footer,
  headerTone = "light",
  wide = false,
  bodyClassName = "px-5 py-4",
  panelTestId,
  dismissOnScrim = true,
  renderHeader,
  initialFocus = "first",
  className,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    lockScroll();
    const panel = panelRef.current;
    // Prefer the first real control; fall back to the panel itself.
    const first = initialFocus === "panel" ? null : panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();
    return () => {
      unlockScroll();
      previouslyFocused?.focus?.();
    };
  }, [open, initialFocus]);

  if (typeof document === "undefined") return null;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) {
      e.preventDefault();
      panel.focus();
      return;
    }
    const firstEl = items[0];
    const lastEl = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === firstEl || active === panel)) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && active === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  }

  // Entrance/exit offsets. Tailwind v4 positions the centred dialog with the
  // `translate` property, so framer's `transform` composes with it.
  const desktop768 = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 768px)").matches;
  const panelMotion =
    presentation === "drawer"
      ? { x: -24 }
      : presentation === "drawer-right"
        ? desktop768
          ? { x: 32 }
          : { y: 48 }
        : desktop768
          ? desktop === "dialog"
            ? { scale: 0.97 }
            : { x: 32 }
          : { y: 48 };

  return createPortal(
    <AnimatePresence>
      {open && (
    <m.div
      key="sheet"
      className="fixed inset-0 z-50"
      onKeyDown={onKeyDown}
      exit={{ opacity: 1, transition: { duration: DUR.base } }}
    >
      <m.div
        data-testid="sheet-scrim"
        aria-hidden="true"
        className="absolute inset-0 bg-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: tween(DUR.base) }}
        exit={{ opacity: 0, transition: tween(DUR.base) }}
        onClick={dismissOnScrim ? () => onCloseRef.current() : undefined}
      />
      <m.div
        ref={panelRef}
        initial={{ opacity: 0, ...panelMotion }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1, transition: tween(DUR.slow) }}
        exit={{ opacity: 0, ...panelMotion, transition: tween(DUR.base) }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid={panelTestId}
        className={cx(
          "absolute flex flex-col bg-surface text-text shadow-overlay outline-none",
          presentation === "drawer" && "inset-y-0 left-0 h-dvh w-full max-w-sm",
          presentation === "drawer-right" &&
            // Phone: bottom sheet. Tablet+: full-height right panel.
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-sheet md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:h-dvh md:w-[420px] md:rounded-none",
          presentation === "responsive" &&
            cx(
                                // Phone: bottom sheet
                "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-sheet",
                // Desktop: centred dialog or right-hand side panel
                desktop === "dialog"
                  ? (wide ? "md:max-w-[850px] " : "md:max-w-lg ") + "md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[85dvh] md:w-full md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-sheet"
                  : "md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-full md:max-w-md md:rounded-l-sheet md:rounded-tr-none",
              ),
          className,
        )}
      >
        {renderHeader ? (
          renderHeader({ titleId, close: onClose })
        ) : (
        <div
          className={cx(
            "flex items-center justify-between gap-4 px-5 py-3",
            headerTone === "dark" ? "rounded-t-sheet bg-black text-white md:rounded-none" : "border-b border-line",
          )}
        >
          <h2 id={titleId} className="type-h3">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Close"
            className={cx(
              "-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors",
              headerTone === "dark" ? "text-white hover:bg-white/15" : "text-ink hover:bg-chip",
            )}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        )}
        <div className={cx("min-h-0 flex-1 overflow-y-auto overscroll-contain", bodyClassName)}>{children}</div>
        {footer && <div className="border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </m.div>
    </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
