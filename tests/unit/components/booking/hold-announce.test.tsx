import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { HoldCountdown } from "@/components/booking/hold-countdown";

describe("HoldCountdown announcements", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-21T08:00:00+10:00"));
  });
  afterEach(() => vi.useRealTimers());

  it("keeps the ticking timer out of the live region and announces only at thresholds", () => {
    render(<HoldCountdown expiresAt="2026-09-21T08:15:00+10:00" />);
    expect(screen.getByRole("timer")).toHaveAttribute("aria-live", "off");
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("");

    const seen: string[] = [""];
    for (let i = 0; i < 900; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      const text = status.textContent ?? "";
      if (seen[seen.length - 1] !== text) seen.push(text);
    }
    // silent, 5 min, 2 min, 1 min, 30 s, expired
    expect(seen).toHaveLength(6);
    expect(seen[seen.length - 1]).toMatch(/expired/i);
    expect(screen.getByRole("timer")).toHaveTextContent("Hold expired");
  });

  it("calls onExpire once when the hold runs out", () => {
    const onExpire = vi.fn();
    render(<HoldCountdown expiresAt="2026-09-21T08:00:02+10:00" onExpire={onExpire} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
