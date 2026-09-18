"use client";

import { useEffect, useState } from "react";

/**
 * Submit/resend button that disables itself for `seconds` and counts down —
 * shared by every place the auth flow needs to render a `retry_after` value
 * (resend-code cooldowns, the 429 password-lockout case) so the countdown
 * behavior is consistent across forms.
 */
export function CountdownButton({
  seconds,
  onExpire,
  label,
  pendingLabel,
  disabled,
  type = "button",
  onClick,
}: {
  /** Seconds remaining, e.g. straight from a 429's `retry_after`. 0 or less renders as immediately available. */
  seconds: number;
  onExpire?: () => void;
  label: string;
  pendingLabel: (secondsLeft: number) => string;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, Math.ceil(seconds)));
  // Tracks the last `seconds` prop we've synced, so a prop change can be
  // detected and folded into state during render — React's documented
  // "adjusting state when a prop changes" pattern — rather than mirroring
  // the prop into state via a `useEffect` (flagged by
  // `react-hooks/set-state-in-effect` as a cascading-render risk). See the
  // same shape of fix in `components/catalog/pdp-availability.tsx`.
  const [prevSeconds, setPrevSeconds] = useState(seconds);
  if (seconds !== prevSeconds) {
    setPrevSeconds(seconds);
    setSecondsLeft(Math.max(0, Math.ceil(seconds)));
  }

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          onExpire?.();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft, onExpire]);

  const isCountingDown = secondsLeft > 0;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isCountingDown}
      className="text-sm font-medium text-zinc-900 underline decoration-zinc-400 underline-offset-2 disabled:cursor-not-allowed disabled:text-zinc-400 disabled:no-underline dark:text-zinc-50 dark:disabled:text-zinc-600"
    >
      {isCountingDown ? pendingLabel(secondsLeft) : label}
    </button>
  );
}
