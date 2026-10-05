/**
 * Hold countdown presentation. The visible timer can update every second, but
 * screen readers must not hear every second: `holdAnnouncement` returns a new
 * string only when the remaining time crosses a threshold, so a polite live
 * region that renders it speaks a handful of times over the whole hold.
 */

export function formatMMSS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export type HoldTone = "ok" | "warn" | "expired";

/** `warn` under two minutes, `expired` at zero. Never colour-only: the label text always changes too. */
export function holdTone(secondsLeft: number): HoldTone {
  if (secondsLeft <= 0) return "expired";
  if (secondsLeft <= 120) return "warn";
  return "ok";
}

/** Empty string means "say nothing". The text is stable inside a threshold band. */
export function holdAnnouncement(secondsLeft: number): string {
  if (secondsLeft <= 0) return "Your held time has expired. Pick another time to continue.";
  if (secondsLeft <= 30) return "About 30 seconds left on your held time.";
  if (secondsLeft <= 60) return "About 1 minute left on your held time.";
  if (secondsLeft <= 120) return "About 2 minutes left on your held time.";
  if (secondsLeft <= 300) return "About 5 minutes left on your held time.";
  return "";
}
