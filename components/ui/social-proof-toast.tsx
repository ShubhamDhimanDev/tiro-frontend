"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { EASE } from "@/components/motion/variants";
import { socialProofApi } from "@/lib/social-proof/client-api";
import { formatRelativeTime, isSocialProofExcluded } from "@/lib/social-proof/format";
import type { SocialProofRow } from "@/lib/social-proof/types";

export const SOCIAL_PROOF_DISMISSED_KEY = "mts_social_proof_dismissed";
const IDLE_FETCH_MS = 8000;
const VISIBLE_MS = 6000;
const GAP_MS = 45000;
const INTERACTION_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(SOCIAL_PROOF_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * "Name from Suburb, ST just purchased X" toast built from REAL recent orders
 * (`/api/social-proof`). Bottom-left, one row at a time: visible 6 s, 45 s
 * gap, cycling. Fetches once after the first interaction or 8 s idle, so it
 * never competes with LCP. Dismiss stops it for the session. Paused while
 * hovered or focused. Never on checkout/booking/orders/account. No rows, no
 * output. Sits above the phone PDP sticky bar; the cart toast is bottom-centre.
 */
export function SocialProofToast() {
  const pathname = usePathname();
  const excluded = isSocialProofExcluded(pathname);
  const reduced = useReducedMotion();

  const [rows, setRows] = useState<SocialProofRow[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [paused, setPaused] = useState(false);
  const fetched = useRef(false);

  // Fetch once, after the first interaction or the idle timeout, whichever is first.
  useEffect(() => {
    if (excluded || fetched.current) return;
    if (readDismissed()) {
      fetched.current = true; // dismissed earlier this session: never fetch, render nothing
      return;
    }
    const run = () => {
      if (fetched.current) return;
      fetched.current = true;
      cleanup();
      void socialProofApi.recentOrders().then((data) => {
        if (data.length === 0) return;
        setRows(data);
        setVisible(true);
      });
    };
    const cleanup = () => {
      window.clearTimeout(idle);
      INTERACTION_EVENTS.forEach((e) => window.removeEventListener(e, run));
    };
    const idle = window.setTimeout(run, IDLE_FETCH_MS);
    INTERACTION_EVENTS.forEach((e) => window.addEventListener(e, run, { passive: true, once: true }));
    return cleanup;
  }, [excluded]);

  // Visible 6 s then a 45 s gap, then the next row. Hover/focus pauses the visible phase.
  useEffect(() => {
    if (rows.length === 0 || dismissed || excluded) return;
    if (visible) {
      if (paused) return;
      const t = window.setTimeout(() => setVisible(false), VISIBLE_MS);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      setIndex((i) => (i + 1) % rows.length);
      setVisible(true);
    }, GAP_MS);
    return () => window.clearTimeout(t);
  }, [rows, visible, paused, dismissed, excluded]);

  const dismiss = useCallback(() => {
    try {
      window.sessionStorage.setItem(SOCIAL_PROOF_DISMISSED_KEY, "1");
    } catch {
      /* storage unavailable: dismissal lasts until reload */
    }
    setDismissed(true);
    setVisible(false);
  }, []);

  const row = rows[index];
  if (excluded || dismissed || !row) return null;

  return (
    <div className="pointer-events-none fixed bottom-28 left-4 z-[54] max-w-[calc(100vw-2rem)] lg:bottom-6 lg:left-6">
      <AnimatePresence>
        {visible && (
          <m.div
            key={index}
            role="status"
            aria-live="polite"
            data-testid="social-proof-toast"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className="pointer-events-auto flex w-80 max-w-full items-start gap-3 rounded-card border border-line border-l-4 border-l-gold bg-surface py-3 pl-4 pr-2 text-sm text-black shadow-overlay"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug">
                {row.first_name} from {row.suburb}, {row.state} just purchased {row.product_label}
              </p>
              <p className="mt-1 text-xs text-muted">{formatRelativeTime(row.purchased_at)}</p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss recent purchase notice"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black/70 hover:bg-band"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
