import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "@/components/ui/tabs";

describe("Tabs", () => {
  const tabs = [
    { key: "a", label: "Search by size", panel: <p>size panel</p> },
    { key: "b", label: "Search by vehicle", panel: <p>vehicle panel</p> },
  ];

  it("shows one panel, uses roving tabindex and arrow keys", async () => {
    const user = userEvent.setup();
    render(<Tabs tabs={tabs} label="Finder" />);
    expect(screen.getByRole("tab", { name: "Search by size" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Search by vehicle" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByText("size panel")).toBeInTheDocument();
    expect(screen.queryByText("vehicle panel")).not.toBeInTheDocument();
    screen.getByRole("tab", { name: "Search by size" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Search by vehicle" })).toHaveFocus();
    expect(screen.getByText("vehicle panel")).toBeInTheDocument();
  });
});
