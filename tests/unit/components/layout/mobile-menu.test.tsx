import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const openPicker = vi.fn();
let zone: { zoneId: string; label: string } | null = null;
vi.mock("@/components/location/location-provider", () => ({
  useLocation: () => ({
    zone,
    loading: false,
    openPicker,
    closePicker: vi.fn(),
    pickerOpen: false,
    clearZone: vi.fn(),
    setZone: vi.fn(),
  }),
}));

let customer: { name: string } | null = null;
const logout = vi.fn();
vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ customer, loading: false, logout, setCustomer: vi.fn() }),
}));

import { MobileMenu } from "@/components/layout/mobile-menu";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";

describe("MobileMenu", () => {
  beforeEach(() => {
    pathname = "/";
    zone = null;
    customer = null;
    openPicker.mockClear();
    logout.mockClear();
    document.body.style.overflow = "";
  });

  it("is a closed menu button by default with a 44px target", () => {
    render(<MobileMenu />);
    const button = screen.getByRole("button", { name: "Open menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button.className).toContain("h-12");
    expect(button.className).toContain("w-12");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a full-height labelled dialog with every required section", async () => {
    const user = userEvent.setup();
    render(<MobileMenu />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const dialog = screen.getByRole("dialog", { name: "Menu" });
    expect(dialog.className).toContain("h-dvh");
    for (const label of ["Shop tyres", "Locations", "Offers", "Mobile services", "About us", "Help center"]) {
      expect(within(dialog).getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(within(dialog).getByRole("link", { name: "Fleet" })).toHaveAttribute("href", "/fleet");
    expect(within(dialog).getByRole("link", { name: "Search tyres" })).toHaveAttribute("href", "/tyres");
    expect(within(dialog).getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(within(dialog).getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/register");
    expect(within(dialog).getByRole("button", { name: /Set your location/ })).toBeInTheDocument();
    const phone = within(dialog).getByRole("link", { name: new RegExp(PHONE_DISPLAY) });
    expect(phone).toHaveAttribute("href", PHONE_HREF);
    expect(PHONE_HREF).toBe("tel:+61434762864");
    const more = within(dialog).getByRole("navigation", { name: "More" });
    for (const label of ["Blog", "Guides", "FAQ", "Help", "Reviews"]) {
      expect(within(more).getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("locks page scroll while open and restores it (and focus) on Escape", async () => {
    const user = userEvent.setup();
    render(<MobileMenu />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
  });

  it("traps focus inside the dialog", async () => {
    const user = userEvent.setup();
    render(
      <>
        <MobileMenu />
        <a href="/outside">outside</a>
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = screen.getByRole("dialog");
    for (let i = 0; i < 40; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("drills into a group to reveal its links, then closes when a link is chosen", async () => {
    const user = userEvent.setup();
    render(<MobileMenu />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Mobile services" }));
    expect(within(dialog).getByRole("button", { name: /Back to/ })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("link", { name: "Puncture repair" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("the location field closes the menu and opens the location picker", async () => {
    const user = userEvent.setup();
    zone = { zoneId: "1", label: "Melbourne Metro" };
    render(<MobileMenu />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await user.click(screen.getByRole("button", { name: /Fitting in Melbourne Metro/ }));
    expect(openPicker).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "Menu" })).not.toBeInTheDocument();
  });

  it("shows account links and Log out for a signed-in customer", async () => {
    const user = userEvent.setup();
    customer = { name: "Sam" };
    render(<MobileMenu />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Hi, Sam")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "My account" })).toHaveAttribute("href", "/account");
    await user.click(within(dialog).getByRole("button", { name: "Log out" }));
    expect(logout).toHaveBeenCalled();
  });
});
