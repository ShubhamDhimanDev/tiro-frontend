"use client";

import type { ReactNode } from "react";
import { HoldCountdown } from "@/components/booking/hold-countdown";
import { CalendarIcon } from "@/components/ui/icons";

/**
 * Slim status bar for an active 15-minute hold. Sticks just under the header
 * (56 / 64 / 72px tall by breakpoint) so the customer can always see how long
 * their time is held, without a modal or a full-width banner. The countdown
 * inside owns the screen reader announcements (thresholds only, not every
 * second).
 */
export function HoldBar({
  expiresAt,
  onExpire,
  detail,
  action,
}: {
  expiresAt: string;
  onExpire: () => void;
  /** Short line about what is held, e.g. "Fri 25 Sep, 9:00 - 9:52 am". */
  detail?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      data-testid="hold-bar"
      className="sticky top-16 z-20 flex items-center gap-3 rounded-card border border-line bg-surface px-3 py-2 shadow-raised md:top-[72px] lg:top-20"
    >
      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-[#14110b]">
        <CalendarIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold text-ink">{detail ?? "Time held for you"}</p>
        <HoldCountdown expiresAt={expiresAt} onExpire={onExpire} />
      </div>
      {action}
    </div>
  );
}
