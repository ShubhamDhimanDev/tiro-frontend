import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { SocialProofToast, SOCIAL_PROOF_DISMISSED_KEY } from "@/components/ui/social-proof-toast";
import { socialProofApi } from "@/lib/social-proof/client-api";
import { formatRelativeTime, isSocialProofExcluded } from "@/lib/social-proof/format";
import type { SocialProofRow } from "@/lib/social-proof/types";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const NOW = Date.parse("2026-10-02T12:00:00Z");
const rows: SocialProofRow[] = [
  { first_name: "Sam", suburb: "Richmond", state: "VIC", product_label: "Bridgestone Turanza", purchased_at: "2026-10-02T10:00:00Z" },
  { first_name: "Alex", suburb: "Fitzroy", state: "VIC", product_label: "Michelin Primacy 4", purchased_at: "2026-10-02T11:30:00Z" },
];

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("SocialProofToast", () => {
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    pathname = "/";
    window.sessionStorage.clear();
    spy = vi.spyOn(socialProofApi, "recentOrders").mockResolvedValue(rows);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not fetch before interaction or the 8s idle timeout, and never blocks first paint", async () => {
    const { container } = render(<SocialProofToast />);
    expect(container).toBeEmptyDOMElement();
    await advance(7900);
    expect(spy).not.toHaveBeenCalled();
    await advance(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("fetches once after the first interaction", async () => {
    render(<SocialProofToast />);
    await act(async () => {
      fireEvent.pointerDown(window);
    });
    await advance(0);
    expect(spy).toHaveBeenCalledTimes(1);
    await advance(10_000);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when the list is empty", async () => {
    spy.mockResolvedValue([]);
    const { container } = render(<SocialProofToast />);
    await advance(8000);
    expect(spy).toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the first row as a polite status with relative time", async () => {
    render(<SocialProofToast />);
    await advance(8000);
    const toast = screen.getByRole("status");
    expect(toast).toHaveAttribute("aria-live", "polite");
    expect(toast).toHaveTextContent("Sam from Richmond, VIC just purchased Bridgestone Turanza");
    expect(toast).toHaveTextContent("2 hours ago");
  });

  it.each(["/checkout", "/checkout/return", "/booking", "/orders/12", "/account/vehicles"])("never renders or fetches on %s", async (p) => {
    pathname = p;
    const { container } = render(<SocialProofToast />);
    await advance(20_000);
    expect(spy).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it("dismissal hides it, persists in sessionStorage, and stops a fresh mount from fetching", async () => {
    const { unmount } = render(<SocialProofToast />);
    await advance(8000);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(window.sessionStorage.getItem(SOCIAL_PROOF_DISMISSED_KEY)).toBe("1");
    await advance(100);
    expect(screen.queryByRole("status")).toBeNull();
    unmount();

    spy.mockClear();
    const { container } = render(<SocialProofToast />);
    await advance(20_000);
    expect(spy).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it("is visible 6s, then waits 45s, then rotates to the next row and wraps around", async () => {
    render(<SocialProofToast />);
    await advance(8000);
    expect(screen.getByRole("status")).toHaveTextContent("Sam from Richmond");

    await advance(6000);
    await advance(100);
    expect(screen.queryByText(/Sam from Richmond/)).toBeNull();

    await advance(44_000);
    expect(screen.queryByRole("status")).toBeNull();
    await advance(1000);
    expect(screen.getByRole("status")).toHaveTextContent("Alex from Fitzroy, VIC just purchased Michelin Primacy 4");

    await advance(6000 + 100);
    expect(screen.queryByText(/Alex from Fitzroy/)).toBeNull();
    await advance(45_000);
    expect(screen.getByRole("status")).toHaveTextContent("Sam from Richmond");
  });

  it("pauses while hovered and resumes on leave", async () => {
    render(<SocialProofToast />);
    await advance(8000);
    const toast = screen.getByRole("status");
    fireEvent.mouseEnter(toast);
    await advance(30_000);
    expect(screen.getByRole("status")).toHaveTextContent("Sam from Richmond");
    fireEvent.mouseLeave(screen.getByRole("status"));
    await advance(6100);
    expect(screen.queryByText(/Sam from Richmond/)).toBeNull();
  });
});

describe("social-proof helpers", () => {
  it("formats relative times", () => {
    const at = (min: number) => new Date(NOW - min * 60_000).toISOString();
    expect(formatRelativeTime(at(0), NOW)).toBe("just now");
    expect(formatRelativeTime(at(1), NOW)).toBe("1 minute ago");
    expect(formatRelativeTime(at(45), NOW)).toBe("45 minutes ago");
    expect(formatRelativeTime(at(60), NOW)).toBe("1 hour ago");
    expect(formatRelativeTime(at(60 * 49), NOW)).toBe("2 days ago");
    expect(formatRelativeTime("nope", NOW)).toBe("recently");
  });

  it("excludes only whole path segments", () => {
    expect(isSocialProofExcluded("/account")).toBe(true);
    expect(isSocialProofExcluded("/accounting-tyres")).toBe(false);
    expect(isSocialProofExcluded("/tyres/foo")).toBe(false);
  });
});
