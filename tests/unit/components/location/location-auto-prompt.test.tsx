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

import {
  LOCATION_PROMPT_DELAY_MS,
  LOCATION_PROMPT_KEY,
  LOCATION_PROMPT_SNOOZE_MS,
  LocationAutoPrompt,
} from "@/components/location/location-auto-prompt";

function mount() {
  render(<LocationAutoPrompt />);
  act(() => {
    vi.advanceTimersByTime(LOCATION_PROMPT_DELAY_MS + 50);
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

  it("opens the picker on the home page after a short delay when no location is saved", () => {
    render(<LocationAutoPrompt />);
    expect(ctx.openPicker).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(LOCATION_PROMPT_DELAY_MS + 50);
    });
    expect(ctx.openPicker).toHaveBeenCalledTimes(1);
    expect(Number(window.localStorage.getItem(LOCATION_PROMPT_KEY))).toBeGreaterThan(0);
  });

  it("does nothing when a location is already saved", () => {
    ctx.zone = { zoneId: "3", label: "Melbourne Metro" };
    mount();
    expect(ctx.openPicker).not.toHaveBeenCalled();
  });

  it("waits for the saved-location check to finish", () => {
    ctx.loading = true;
    mount();
    expect(ctx.openPicker).not.toHaveBeenCalled();
  });

  it("does nothing on pages other than the home page", () => {
    pathname = "/tyres";
    mount();
    expect(ctx.openPicker).not.toHaveBeenCalled();
  });

  it("stays quiet for a week after it was last shown, then asks again", () => {
    window.localStorage.setItem(LOCATION_PROMPT_KEY, String(Date.now() - 60_000));
    mount();
    expect(ctx.openPicker).not.toHaveBeenCalled();

    window.localStorage.setItem(LOCATION_PROMPT_KEY, String(Date.now() - LOCATION_PROMPT_SNOOZE_MS - 1000));
    mount();
    expect(ctx.openPicker).toHaveBeenCalledTimes(1);
  });

  it("still asks when browser storage is blocked", () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    mount();
    expect(ctx.openPicker).toHaveBeenCalledTimes(1);
    get.mockRestore();
    set.mockRestore();
  });
});
