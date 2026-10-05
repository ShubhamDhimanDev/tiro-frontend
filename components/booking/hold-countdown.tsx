"use client";

import { useEffect, useState } from "react";
import { formatMMSS, holdAnnouncement, holdTone } from "@/lib/booking/hold";

function secondsUntil(expiresAtIso: string): number {
  return Math.max(0, Math.round((new Date(expiresAtIso).getTime() - Date.now()) / 1000));
}

/**
 * Live `hold_expires_at` countdown for a `pending_hold` booking, so the
 * customer knows the slot isn't permanently theirs yet. Recomputes from the
 * wall-clock `expiresAt` on every tick (rather than decrementing a local
 * counter) so it self-corrects across tab backgrounding/timer throttling, and
 * stays correct across a reschedule (which doesn't change `hold_expires_at`).
 *
 * Accessibility: the visible timer (`role="timer"`) updates every second but is
 * `aria-live="off"`, so assistive tech never reads out each tick. A separate
 * visually hidden polite `role="status"` region carries short announcements
 * only when the remaining time crosses 5 min, 2 min, 1 min, 30 s and expiry
 * (`holdAnnouncement`). Colour is never the only signal: the timer text changes
 * to "Hold expired" at zero.
 *
 * `expiresAt` is folded into state during render (React's "adjusting state
 * when a prop changes" pattern) so a new value shows on the next render without
 * waiting on an effect tick. `onExpire` fires exactly once per `expiresAt`
 * value that reaches (or already starts at) zero; callers
 * (`components/booking/booking-flow.tsx`) rely on this as the single source of
 * truth for "has this hold expired".
 */
export function HoldCountdown({
  expiresAt,
  onExpire,
  announce = true,
}: {
  expiresAt: string;
  onExpire?: () => void;
  /** Set false when a parent already renders its own live region for the hold. */
  announce?: boolean;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(expiresAt));
  const [prevExpiresAt, setPrevExpiresAt] = useState(expiresAt);
  if (expiresAt !== prevExpiresAt) {
    setPrevExpiresAt(expiresAt);
    setSecondsLeft(secondsUntil(expiresAt));
  }

  useEffect(() => {
    // `secondsLeft` reaching (or starting at) 0 is the single trigger for
    // `onExpire`: the interval only ever calls `setSecondsLeft`, so a tick that
    // lands on zero re-runs this effect once more and hits this branch, rather
    // than firing from two places.
    if (secondsLeft <= 0) {
      onExpire?.();
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft(secondsUntil(expiresAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft, expiresAt, onExpire]);

  const tone = holdTone(secondsLeft);
  const toneClass = tone === "ok" ? "text-ink" : "font-extrabold text-black underline underline-offset-2";

  return (
    <>
      <span
        role="timer"
        aria-live="off"
        data-tone={tone}
        className={`whitespace-nowrap text-sm font-semibold tabular-nums ${toneClass}`}
      >
        {tone === "expired" ? "Hold expired" : `Hold expires in ${formatMMSS(secondsLeft)}`}
      </span>
      {announce && (
        <span role="status" aria-live="polite" className="sr-only">
          {holdAnnouncement(secondsLeft)}
        </span>
      )}
    </>
  );
}
