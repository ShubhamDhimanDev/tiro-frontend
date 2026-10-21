import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { HeroFinder } from "@/components/home/hero-finder";
import { isRegoEnabled } from "@/lib/rego/flag";
import { REGO_NO_MATCH_MESSAGE, validateRego } from "@/lib/rego/validate";
import { lookupRego } from "@/lib/rego/adapter";
import type { RegoLookup } from "@/lib/rego/adapter";

describe("HeroFinder tabs", () => {
  beforeEach(() => {
    ctx.zone = null;
    ctx.openPicker.mockClear();
  });

  it("shows Search by size and vehicle only when the rego flag is off", () => {
    render(<HeroFinder />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Search by size", "Search by vehicle"]);
    expect(screen.queryByRole("tab", { name: "Search by rego" })).not.toBeInTheDocument();
  });

  it("adds a Rego tab when the flag is on", () => {
    render(<HeroFinder regoEnabled />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Search by size", "Search by vehicle", "Search by rego"]);
  });

  it("starts on Size with the real size search form and keeps staggered fitment reachable", () => {
    render(<HeroFinder />);
    expect(screen.getByRole("tab", { name: "Search by size" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Find tyres" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /staggered/i })).toBeInTheDocument();
  });

  it("moves between tabs with the arrow keys, wrapping, with roving tabindex", async () => {
    const user = userEvent.setup();
    render(<HeroFinder regoEnabled />);
    screen.getByRole("tab", { name: "Search by size" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Search by vehicle" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Search by vehicle" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Search by size" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("link", { name: "Find by vehicle" })).toHaveAttribute("href", "/tyres/by-vehicle");
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Search by rego" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Search by size" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Search by rego" })).toHaveFocus();
  });

  it("opens the shared location sheet from the inline suburb chip", async () => {
    const user = userEvent.setup();
    render(<HeroFinder />);
    await user.click(screen.getByRole("button", { name: /add your suburb/i }));
    expect(ctx.openPicker).toHaveBeenCalledTimes(1);
  });

  it("names the resolved area in the chip without duplicating the header chip name", () => {
    ctx.zone = { zoneId: "3", label: "Melbourne Metro" };
    render(<HeroFinder />);
    const chip = screen.getByRole("button", { name: /Melbourne Metro/ });
    expect(chip.textContent).not.toContain("Fitting in");
  });
});

describe("Rego tab", () => {
  async function openRego(lookup?: RegoLookup) {
    const user = userEvent.setup();
    render(<HeroFinder regoEnabled lookupRego={lookup} />);
    await user.click(screen.getByRole("tab", { name: "Search by rego" }));
    return user;
  }

  it("asks for a plate, then a state", async () => {
    const lookup = vi.fn();
    const user = await openRego(lookup);
    await user.click(screen.getByRole("button", { name: "Find tyres" }));
    expect(screen.getByText("Enter your number plate.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Vehicle registration"), "abc123");
    await user.click(screen.getByRole("button", { name: "Find tyres" }));
    expect(screen.getByText("Choose the state your plate is registered in.")).toBeInTheDocument();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("rejects punctuation in the plate", async () => {
    const user = await openRego();
    await user.type(screen.getByLabelText("Vehicle registration"), "AB!12");
    await user.selectOptions(screen.getByLabelText("State"), "VIC");
    await user.click(screen.getByRole("button", { name: "Find tyres" }));
    expect(screen.getByText("Plates use letters and numbers only.")).toBeInTheDocument();
  });

  it("shows the no-match copy and a way back to size search", async () => {
    const lookup = vi.fn(async () => ({ kind: "no_match" as const }));
    const user = await openRego(lookup);
    await user.type(screen.getByLabelText("Vehicle registration"), "abc 123");
    await user.selectOptions(screen.getByLabelText("State"), "VIC");
    await user.click(screen.getByRole("button", { name: "Find tyres" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(REGO_NO_MATCH_MESSAGE);
    expect(lookup).toHaveBeenCalledWith({ plate: "ABC123", state: "VIC" });
    await user.click(screen.getByRole("button", { name: "Search by size" }));
    expect(screen.getByRole("tab", { name: "Search by size" })).toHaveAttribute("aria-selected", "true");
  });

  it("shows a busy state while the lookup is in flight", async () => {
    let resolve!: (v: { kind: "no_match" }) => void;
    const lookup = vi.fn(() => new Promise<{ kind: "no_match" }>((r) => (resolve = r)));
    const user = await openRego(lookup);
    await user.type(screen.getByLabelText("Vehicle registration"), "ABC123");
    await user.selectOptions(screen.getByLabelText("State"), "NSW");
    await user.click(screen.getByRole("button", { name: "Find tyres" }));
    const busy = screen.getByRole("button", { name: "Looking up" });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    resolve({ kind: "no_match" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Find tyres" })).toBeEnabled());
  });

  it("with the stub adapter says search is not available yet (no fake result)", async () => {
    const user = await openRego();
    await user.type(screen.getByLabelText("Vehicle registration"), "ABC123");
    await user.selectOptions(screen.getByLabelText("State"), "QLD");
    await user.click(screen.getByRole("button", { name: "Find tyres" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("available yet");
  });
});

describe("rego lib", () => {
  it("flag defaults off and turns on for true/1", () => {
    const prev = process.env.NEXT_PUBLIC_FEATURE_REGO;
    delete process.env.NEXT_PUBLIC_FEATURE_REGO;
    expect(isRegoEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_FEATURE_REGO = "true";
    expect(isRegoEnabled()).toBe(true);
    process.env.NEXT_PUBLIC_FEATURE_REGO = "1";
    expect(isRegoEnabled()).toBe(true);
    process.env.NEXT_PUBLIC_FEATURE_REGO = "false";
    expect(isRegoEnabled()).toBe(false);
    if (prev === undefined) delete process.env.NEXT_PUBLIC_FEATURE_REGO;
    else process.env.NEXT_PUBLIC_FEATURE_REGO = prev;
  });

  it("normalises and validates plates", () => {
    expect(validateRego(" ab-c 123 ", "VIC")).toEqual({ ok: true, plate: "ABC123", state: "VIC" });
    expect(validateRego("A", "VIC")).toMatchObject({ ok: false, field: "plate" });
    expect(validateRego("ABC123", "XX")).toMatchObject({ ok: false, field: "state" });
  });

  it("the stub adapter reports not implemented", async () => {
    expect(await lookupRego({ plate: "ABC123", state: "VIC" })).toEqual({ kind: "not_implemented" });
  });
});
