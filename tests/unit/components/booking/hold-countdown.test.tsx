import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { HoldCountdown } from "@/components/booking/hold-countdown";

/**
 * Mirrors `tests/unit/components/auth/countdown-button.test.tsx`'s coverage
 * shape for the same render-time prop-sync pattern, applied here to a
 * wall-clock target (`hold_expires_at`) instead of a fixed `seconds` count.
 */
describe("HoldCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-21T08:30:00+10:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the remaining time counting down from the wall-clock target", () => {
    render(<HoldCountdown expiresAt="2026-09-21T08:30:05+10:00" />);
    expect(screen.getByRole("timer")).toHaveTextContent("Hold expires in 0:05");
  });

  it("ticks down once per second and shows 'Hold expired' at zero, firing onExpire once", () => {
    const onExpire = vi.fn();
    render(<HoldCountdown expiresAt="2026-09-21T08:30:03+10:00" onExpire={onExpire} />);

    expect(screen.getByRole("timer")).toHaveTextContent("Hold expires in 0:03");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("timer")).toHaveTextContent("Hold expires in 0:02");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("timer")).toHaveTextContent("Hold expired");
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("formats minutes:seconds for a longer window", () => {
    render(<HoldCountdown expiresAt="2026-09-21T08:44:30+10:00" />);
    expect(screen.getByRole("timer")).toHaveTextContent("Hold expires in 14:30");
  });

  it("syncs a new expiresAt prop synchronously on rerender", () => {
    const { rerender } = render(<HoldCountdown expiresAt="2026-09-21T08:30:30+10:00" />);
    expect(screen.getByRole("timer")).toHaveTextContent("Hold expires in 0:30");

    rerender(<HoldCountdown expiresAt="2026-09-21T08:30:10+10:00" />);
    expect(screen.getByRole("timer")).toHaveTextContent("Hold expires in 0:10");
  });

  it("renders 'Hold expired' immediately for a target already in the past", () => {
    render(<HoldCountdown expiresAt="2026-09-21T08:00:00+10:00" />);
    expect(screen.getByRole("timer")).toHaveTextContent("Hold expired");
  });
});
