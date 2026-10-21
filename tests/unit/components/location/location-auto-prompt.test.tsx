import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

const ctx = {
  zone: null as { zoneId: string; label: string } | null,
  loading: false,
  openPicker: vi.fn(),
};
let pathname = "/";
vi.mock("@/components/location/location-provider", () => ({ useLocation: () => ctx }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

/** The component remembers "already shown" at module level, so load a fresh copy to simulate a new page load. */
async function freshPrompt() {
  vi.resetModules();
  return import("@/components/location/location-auto-prompt");
}

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("LocationAutoPrompt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    ctx.zone = null;
    ctx.loading = false;
    ctx.openPicker.mockClear();
    pathname = "/";
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens the picker on the home page after a short delay when no location is saved", async () => {
    const { LocationAutoPrompt, LOCATION_PROMPT_DELAY_MS } = await freshPrompt();
    render(<LocationAutoPrompt />);
    expect(ctx.openPicker).not.toHaveBeenCalled();
    wait(LOCATION_PROMPT_DELAY_MS + 50);
    expect(ctx.openPicker).toHaveBeenCalledTimes(1);
  });

  it("asks again on every new page load until a location is saved", async () => {
    for (let visit = 1; visit <= 3; visit++) {
      const { LocationAutoPrompt, LOCATION_PROMPT_DELAY_MS } = await freshPrompt();
      const { unmount } = render(<LocationAutoPrompt />);
      wait(LOCATION_PROMPT_DELAY_MS + 50);
      expect(ctx.openPicker).toHaveBeenCalledTimes(visit);
      unmount();
    }
  });

  it("does not re-open within the same page load", async () => {
    const { LocationAutoPrompt, LOCATION_PROMPT_DELAY_MS } = await freshPrompt();
    const first = render(<LocationAutoPrompt />);
    wait(LOCATION_PROMPT_DELAY_MS + 50);
    first.unmount();
    // Back on the home page after browsing elsewhere in the same visit.
    render(<LocationAutoPrompt />);
    wait(LOCATION_PROMPT_DELAY_MS + 50);
    expect(ctx.openPicker).toHaveBeenCalledTimes(1);
  });

  it("does nothing when a location is already saved", async () => {
    ctx.zone = { zoneId: "3", label: "Melbourne Metro" };
    const { LocationAutoPrompt, LOCATION_PROMPT_DELAY_MS } = await freshPrompt();
    render(<LocationAutoPrompt />);
    wait(LOCATION_PROMPT_DELAY_MS + 50);
    expect(ctx.openPicker).not.toHaveBeenCalled();
  });

  it("waits for the saved-location check to finish", async () => {
    ctx.loading = true;
    const { LocationAutoPrompt, LOCATION_PROMPT_DELAY_MS } = await freshPrompt();
    render(<LocationAutoPrompt />);
    wait(LOCATION_PROMPT_DELAY_MS + 50);
    expect(ctx.openPicker).not.toHaveBeenCalled();
  });

  it("does nothing on pages other than the home page", async () => {
    pathname = "/tyres";
    const { LocationAutoPrompt, LOCATION_PROMPT_DELAY_MS } = await freshPrompt();
    render(<LocationAutoPrompt />);
    wait(LOCATION_PROMPT_DELAY_MS + 50);
    expect(ctx.openPicker).not.toHaveBeenCalled();
  });

  it("stays silent when the off switch is set in local storage", async () => {
    const { LocationAutoPrompt, LOCATION_PROMPT_DELAY_MS, LOCATION_PROMPT_OFF_KEY } = await freshPrompt();
    window.localStorage.setItem(LOCATION_PROMPT_OFF_KEY, "1");
    render(<LocationAutoPrompt />);
    wait(LOCATION_PROMPT_DELAY_MS + 50);
    expect(ctx.openPicker).not.toHaveBeenCalled();
  });

  it("still asks when browser storage is blocked", async () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { LocationAutoPrompt, LOCATION_PROMPT_DELAY_MS } = await freshPrompt();
    render(<LocationAutoPrompt />);
    wait(LOCATION_PROMPT_DELAY_MS + 50);
    expect(ctx.openPicker).toHaveBeenCalledTimes(1);
    get.mockRestore();
  });
});
