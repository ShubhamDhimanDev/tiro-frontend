import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { CountdownButton } from "@/components/auth/countdown-button";

/**
 * Regression coverage for the render-time prop-sync pattern documented on
 * the component itself: `seconds` is folded into state during render
 * (React's "adjusting state when a prop changes" pattern) rather than via a
 * `useEffect`, specifically to avoid the `react-hooks/set-state-in-effect`
 * lint violation an effect-based sync previously tripped. The property that
 * pattern buys us — and what an effect-based regression would break — is
 * that a new `seconds` value is reflected on the *very next render*, with no
 * extra effect-flush render/tick needed first.
 */
describe("CountdownButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the plain label and is enabled when seconds is 0", () => {
    render(<CountdownButton seconds={0} label="Resend code" pendingLabel={(s) => `Resend in ${s}s`} />);
    const button = screen.getByRole("button", { name: "Resend code" });
    expect(button).toBeEnabled();
  });

  it("counts down once per second and re-enables at zero, firing onExpire", () => {
    const onExpire = vi.fn();
    render(<CountdownButton seconds={3} label="Resend code" pendingLabel={(s) => `Resend in ${s}s`} onExpire={onExpire} />);

    expect(screen.getByRole("button", { name: "Resend in 3s" })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("button", { name: "Resend in 2s" })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("button", { name: "Resend in 1s" })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("button", { name: "Resend code" })).toBeEnabled();
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("syncs a new seconds prop synchronously on rerender, without waiting on an effect tick", () => {
    const { rerender } = render(
      <CountdownButton seconds={30} label="Resend code" pendingLabel={(s) => `Resend in ${s}s`} />
    );
    expect(screen.getByRole("button", { name: "Resend in 30s" })).toBeInTheDocument();

    // Simulate a fresh 429 retry_after / resend triggering a brand new
    // countdown window. No timers are advanced between render and this
    // assertion — if the sync lived in a `useEffect` instead of render, this
    // assertion would still see the *old* value here (effects run after
    // paint, not synchronously with the render that changed the prop).
    rerender(<CountdownButton seconds={10} label="Resend code" pendingLabel={(s) => `Resend in ${s}s`} />);
    expect(screen.getByRole("button", { name: "Resend in 10s" })).toBeInTheDocument();
  });

  it("restarts the interval against the new prop value after a mid-countdown resync", () => {
    const onExpire = vi.fn();
    const { rerender } = render(
      <CountdownButton seconds={30} label="Resend code" pendingLabel={(s) => `Resend in ${s}s`} onExpire={onExpire} />
    );

    act(() => {
      vi.advanceTimersByTime(5000); // 30 -> 25
    });
    expect(screen.getByRole("button", { name: "Resend in 25s" })).toBeInTheDocument();

    // A new, shorter countdown arrives mid-flight.
    rerender(<CountdownButton seconds={2} label="Resend code" pendingLabel={(s) => `Resend in ${s}s`} onExpire={onExpire} />);
    expect(screen.getByRole("button", { name: "Resend in 2s" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("button", { name: "Resend code" })).toBeEnabled();
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("respects an externally-disabled state even once the countdown reaches zero", () => {
    render(<CountdownButton seconds={0} disabled label="Resend code" pendingLabel={(s) => `Resend in ${s}s`} />);
    expect(screen.getByRole("button", { name: "Resend code" })).toBeDisabled();
  });
});
