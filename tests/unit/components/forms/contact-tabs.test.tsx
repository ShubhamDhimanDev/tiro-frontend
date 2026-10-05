import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let search = "";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(search) }));
vi.mock("@/lib/enquiries/client-api", () => ({ submitEnquiry: vi.fn(), THROTTLE_MESSAGE: "x" }));

import { ContactTabs } from "@/components/forms/contact-tabs";

describe("ContactTabs", () => {
  beforeEach(() => {
    search = "";
    window.history.replaceState(null, "", "/contact");
  });

  it("starts on Contact with three tabs and only the active one in the tab order", () => {
    render(<ContactTabs />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Contact", "Get a quote", "Fleet enquiry"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Contact");
    expect(screen.getByLabelText(/How can we help/)).toBeInTheDocument();
  });

  it("moves between tabs with the arrow keys, Home and End, and swaps the form", async () => {
    const user = userEvent.setup();
    render(<ContactTabs />);
    screen.getByRole("tab", { name: "Contact" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Get a quote" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Get a quote" })).toHaveFocus();
    expect(screen.getByLabelText(/^Tyre size/)).toBeInTheDocument();

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Fleet enquiry" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText(/^Fleet size/)).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Contact" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Contact" })).toHaveFocus();
  });

  it("opens the quote tab with the size prefilled from a tyre empty state link", () => {
    search = "type=quote&size=205%2F55R16";
    render(<ContactTabs />);
    expect(screen.getByRole("tab", { name: "Get a quote" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText(/^Tyre size/)).toHaveValue("205/55R16");
  });

  it("ignores a size that does not look like a tyre size, and an unknown type", () => {
    search = "type=admin&size=%3Cscript%3E";
    render(<ContactTabs />);
    expect(screen.getByRole("tab", { name: "Contact" })).toHaveAttribute("aria-selected", "true");
  });

  it("only writes the tab into the URL, never anything typed", async () => {
    const user = userEvent.setup();
    render(<ContactTabs />);
    await user.click(screen.getByRole("tab", { name: "Fleet enquiry" }));
    expect(window.location.search).toBe("?type=fleet");
  });
});
