import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import { HeaderNav } from "@/components/layout/header-nav";

describe("HeaderNav (desktop mega menu)", () => {
  beforeEach(() => {
    pathname = "/";
  });
  afterEach(() => vi.useRealTimers());

  it("renders the six dropdown triggers and Fleet link, all collapsed", () => {
    render(<HeaderNav />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    const buttons = Array.from(nav.querySelectorAll("button"));
    expect(buttons.map((b) => b.textContent)).toEqual(["Shop tyres", "Locations", "Offers", "Mobile services", "About us", "Help center"]);
    expect(screen.getByRole("link", { name: "Fleet" })).toHaveAttribute("href", "/fleet");
    for (const b of buttons) expect(b).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "Shop tyres menu" })).not.toBeInTheDocument();
  });

  it("keeps closed panels' links in the DOM (hidden) for crawlers", () => {
    const { container } = render(<HeaderNav />);
    expect(container.querySelector('a[href="/services/onsite-fitting"]')).not.toBeNull();
  });

  it("opens on click, exposes aria-expanded/aria-controls, and toggles closed", async () => {
    const user = userEvent.setup();
    render(<HeaderNav />);
    const tyres = screen.getByRole("button", { name: "Shop tyres" });
    await user.click(tyres);
    expect(tyres).toHaveAttribute("aria-expanded", "true");
    const region = screen.getByRole("region", { name: "Shop tyres menu" });
    expect(tyres.getAttribute("aria-controls")).toBe(region.id);
    expect(region).toBeVisible();
    expect(screen.getByRole("link", { name: "By size" })).toHaveAttribute("href", "/tyres");
    expect(screen.getByRole("link", { name: "By vehicle" })).toHaveAttribute("href", "/tyres/by-vehicle");

    await user.click(tyres);
    expect(tyres).toHaveAttribute("aria-expanded", "false");
  });

  it("is operable by keyboard: Enter opens, Tab reaches panel links, Escape closes and returns focus", async () => {
    const user = userEvent.setup();
    render(<HeaderNav />);
    const services = screen.getByRole("button", { name: "Mobile services" });
    services.focus();
    await user.keyboard("{Enter}");
    expect(services).toHaveAttribute("aria-expanded", "true");

    // The open panel follows its trigger in DOM order, so one Tab enters it.
    await user.tab();
    const active = document.activeElement as HTMLElement;
    expect(active.closest('[role="region"]')).not.toBeNull();

    await user.keyboard("{Escape}");
    expect(services).toHaveAttribute("aria-expanded", "false");
    expect(services).toHaveFocus();
  });

  it("opens only one panel at a time", async () => {
    const user = userEvent.setup();
    render(<HeaderNav />);
    await user.click(screen.getByRole("button", { name: "Shop tyres" }));
    await user.click(screen.getByRole("button", { name: "Help center" }));
    expect(screen.getByRole("button", { name: "Shop tyres" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Help center" })).toHaveAttribute("aria-expanded", "true");
  });

  it("closes when the pointer goes down outside the nav", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <HeaderNav />
        <button>elsewhere</button>
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Shop tyres" }));
    await user.click(screen.getByRole("button", { name: "elsewhere" }));
    expect(screen.getByRole("button", { name: "Shop tyres" })).toHaveAttribute("aria-expanded", "false");
  });

  it("opens on mouse hover intent after a short delay, and not for touch pointers", () => {
    vi.useFakeTimers();
    render(<HeaderNav />);
    const item = screen.getByRole("button", { name: "Offers" }).closest("li")!;

    fireEvent.pointerEnter(item, { pointerType: "touch" });
    act(() => void vi.advanceTimersByTime(500));
    expect(screen.getByRole("button", { name: "Offers" })).toHaveAttribute("aria-expanded", "false");

    fireEvent.pointerEnter(item, { pointerType: "mouse" });
    expect(screen.getByRole("button", { name: "Offers" })).toHaveAttribute("aria-expanded", "false");
    act(() => void vi.advanceTimersByTime(200));
    expect(screen.getByRole("button", { name: "Offers" })).toHaveAttribute("aria-expanded", "true");
  });

  it("marks the current section and the current link with aria-current", async () => {
    pathname = "/services/puncture-repair";
    const user = userEvent.setup();
    render(<HeaderNav />);
    expect(screen.getByRole("button", { name: "Mobile services" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Shop tyres" })).not.toHaveAttribute("aria-current");
    await user.click(screen.getByRole("button", { name: "Mobile services" }));
    expect(screen.getByRole("link", { name: "Puncture repair" })).toHaveAttribute("aria-current", "page");
  });
});
