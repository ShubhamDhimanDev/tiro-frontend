import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { ReadMore } from "@/components/ui/read-more";
import { Steps } from "@/components/ui/steps";
import { totalForQuantity } from "@/lib/catalog/price";
import { formatMoney } from "@/lib/catalog/format-money";

function Harness() {
  const [q, setQ] = useState(4);
  return (
    <>
      <QuantityStepper value={q} onChange={setQ} />
      <output data-testid="total">{formatMoney(totalForQuantity(18900, q))}</output>
    </>
  );
}

describe("QuantityStepper", () => {
  it("starts at 4, updates the total, and respects bounds", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByTestId("total")).toHaveTextContent("$756.00");
    await user.click(screen.getByRole("button", { name: "Decrease quantity" }));
    expect(screen.getByTestId("total")).toHaveTextContent("$567.00");
    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(screen.getByRole("spinbutton", { name: "Quantity" })).toHaveValue(5);
  });
  it("disables minus at 1", () => {
    render(<QuantityStepper value={1} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
  });
});

describe("ReadMore", () => {
  it("toggles aria-expanded", async () => {
    const user = userEvent.setup();
    render(<ReadMore>Some text</ReadMore>);
    const btn = screen.getByRole("button", { name: "Read more" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    await user.click(btn);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
  });
});

describe("Steps", () => {
  it("marks the current step", () => {
    render(
      <Steps
        label="Progress"
        steps={[
          { label: "Make", value: "Holden", state: "done" },
          { label: "Model", state: "current" },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[0]).not.toHaveAttribute("aria-current");
  });
});
