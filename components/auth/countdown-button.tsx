"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Submit/resend button that disables itself for `seconds` and counts down —
 * shared by every place the auth flow needs to render a `retry_after` value
 * (resend-code cooldowns, the 429 password-lockout case) so the countdown
 * behavior is consistent across forms. `appearance="button"` renders the
 * full-width primary button used in place of a submit while locked out;
 * the default is the quiet text style used for "Resend code".
 */
export function CountdownButton({
  seconds,
  onExpire,
  label,
  pendingLabel,
  disabled,
  type = "button",
  onClick,
  appearance = "link",
}: {
  /** Seconds remaining, e.g. straight from a 429's `retry_after`. 0 or less renders as immediately available. */
  seconds: number;
  onExpire?: () => void;
  label: string;
  pendingLabel: (secondsLeft: number) => string;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  appearance?: "link" | "button";
}) {
  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, Math.ceil(seconds)));
  // Tracks the last `seconds` prop we've synced, so a prop change can be
  // detected and folded into state during render — React's documented
  // "adjusting state when a prop changes" pattern — rather than mirroring
  // the prop into state via a `useEffect` (flagged by
  // `react-hooks/set-state-in-effect` as a cascading-render risk).
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
  const text = isCountingDown ? pendingLabel(secondsLeft) : label;

  if (appearance === "button") {
    return (
      <Button type={type} onClick={onClick} disabled={disabled || isCountingDown} fullWidth>
        {text}
      </Button>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isCountingDown}
      className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-black underline decoration-gold decoration-[3px] underline-offset-4 hover:text-muted disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
    >
      {text}
    </button>
  );
}
