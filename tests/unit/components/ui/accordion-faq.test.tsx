import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Accordion } from "@/components/ui/accordion";
import { FaqExplorer } from "@/components/content/faq-explorer";

const items = [
  { id: 1, title: "How long does fitting take?", content: "About 45 minutes." },
  { id: 2, title: "Do you recycle old tyres?", content: "Yes, we take them." },
  { id: 3, title: "Can I move my booking?", content: "Yes, from your order page." },
];

describe("Accordion", () => {
  it("renders every header as a collapsed button wired to a labelled region", () => {
    render(<Accordion items={items} />);
    for (const item of items) {
      const trigger = screen.getByRole("button", { name: item.title });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      const panelId = trigger.getAttribute("aria-controls");
      expect(panelId).toBeTruthy();
      const panel = document.getElementById(panelId!)!;
      expect(panel).toHaveAttribute("role", "region");
      expect(panel).toHaveAttribute("aria-labelledby", trigger.id);
      expect(panel).toHaveAttribute("hidden");
    }
  });

  it("toggles with Enter and Space and reveals the answer", async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);
    const trigger = screen.getByRole("button", { name: items[0].title });

    trigger.focus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("About 45 minutes.")).toBeVisible();

    await user.keyboard(" ");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("About 45 minutes.")).not.toBeVisible();
  });

  it("moves focus between headers with the arrow keys, Home and End (wrapping)", () => {
    render(<Accordion items={items} />);
    const [a, b, c] = items.map((i) => screen.getByRole("button", { name: i.title }));

    a.focus();
    fireEvent.keyDown(a, { key: "ArrowDown" });
    expect(b).toHaveFocus();
    fireEvent.keyDown(b, { key: "End" });
    expect(c).toHaveFocus();
    fireEvent.keyDown(c, { key: "ArrowDown" });
    expect(a).toHaveFocus();
    fireEvent.keyDown(a, { key: "ArrowUp" });
    expect(c).toHaveFocus();
    fireEvent.keyDown(c, { key: "Home" });
    expect(a).toHaveFocus();
  });
});

describe("FaqExplorer", () => {
  const groups = [
    { category: "booking", items: [{ id: 1, question: "Booking Q1", answer: "A1" }] },
    { category: "pricing", items: [{ id: 2, question: "Pricing Q1", answer: "A2" }] },
  ];

  it("shows every category as an h2 with All selected, then filters with a chip", async () => {
    const user = userEvent.setup();
    render(<FaqExplorer groups={groups} />);

    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { level: 2, name: "booking" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "pricing" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "pricing" }));
    expect(screen.getByRole("button", { name: "pricing" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("heading", { level: 2, name: "booking" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pricing Q1" })).toBeInTheDocument();
  });

  it("shows the reserved \"pdp\" category as \"Tyres\", not the raw slug", () => {
    render(<FaqExplorer groups={[groups[0], { category: "pdp", items: [{ id: 3, question: "Tyre Q1", answer: "A3" }] }]} />);
    expect(screen.getByRole("heading", { level: 2, name: "Tyres" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tyres" })).toBeInTheDocument();
    expect(screen.queryByText("pdp")).not.toBeInTheDocument();
  });

  it("hides the chip row when there is only one category", () => {
    render(<FaqExplorer groups={[groups[0]]} />);
    expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument();
  });
});
