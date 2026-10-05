import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const ctx = {
  zone: null as { zoneId: string; label: string } | null,
  loading: false,
  pickerOpen: false,
  openPicker: vi.fn(),
  closePicker: vi.fn(),
  clearZone: vi.fn(async () => {}),
  setZone: vi.fn(),
};
vi.mock("@/components/location/location-provider", () => ({ useLocation: () => ctx }));
vi.mock("@/lib/location/client-api", () => ({ locationApi: { check: vi.fn() } }));

import { LocationChip, locationLabel } from "@/components/location/location-chip";
import { LocationSheet } from "@/components/location/location-sheet";

describe("LocationChip", () => {
  beforeEach(() => {
    ctx.zone = null;
    ctx.loading = false;
    ctx.pickerOpen = false;
    ctx.openPicker.mockClear();
    ctx.closePicker.mockClear();
  });

  it("prompts to set a location when there is no zone", () => {
    render(<LocationChip />);
    expect(screen.getByRole("button", { name: "Set your location" })).toBeInTheDocument();
    expect(locationLabel(null)).toBe("Set your location");
  });

  it("shows the fitting area when a zone is resolved", () => {
    ctx.zone = { zoneId: "3", label: "Melbourne Metro" };
    render(<LocationChip />);
    expect(screen.getByRole("button", { name: "Fitting in Melbourne Metro" })).toBeInTheDocument();
  });

  it("opens the location sheet on click and never blocks on its own", async () => {
    render(<LocationChip />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Set your location" }));
    expect(ctx.openPicker).toHaveBeenCalledTimes(1);
  });

  it("reserves space (no button) while the zone check is in flight", () => {
    ctx.loading = true;
    const { container } = render(<LocationChip />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("LocationSheet", () => {
  beforeEach(() => {
    ctx.zone = null;
    ctx.pickerOpen = false;
    ctx.closePicker.mockClear();
  });

  it("renders nothing until the picker is opened", () => {
    render(<LocationSheet />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("contains the suburb/postcode form and closes on Escape", async () => {
    ctx.pickerOpen = true;
    render(<LocationSheet />);
    expect(screen.getByRole("dialog", { name: "Select fitting location" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Suburb or postcode/ })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(ctx.closePicker).toHaveBeenCalled();
  });

  it("offers to clear a saved location", () => {
    ctx.pickerOpen = true;
    ctx.zone = { zoneId: "3", label: "Melbourne Metro" };
    render(<LocationSheet />);
    expect(screen.getByText("Melbourne Metro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear saved location" })).toBeInTheDocument();
  });
});
