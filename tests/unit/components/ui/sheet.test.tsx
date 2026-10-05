import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sheet } from "@/components/ui/sheet";

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open filters</button>
      <Sheet
        open={open}
        title="Filters"
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        footer={<button>Apply</button>}
      >
        <label>
          Brand
          <input />
        </label>
      </Sheet>
    </>
  );
}

describe("Sheet", () => {
  it("renders nothing while closed", () => {
    render(
      <Sheet open={false} title="Filters" onClose={() => {}}>
        body
      </Sheet>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is a labelled modal dialog and moves focus inside", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open filters" }));
    const dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const trigger = screen.getByRole("button", { name: "Open filters" });
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes from the close button and from the scrim", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open filters" }));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Open filters" }));
    await userEvent.click(screen.getByTestId("sheet-scrim"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("traps Tab focus inside the dialog in both directions", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open filters" }));
    const close = screen.getByRole("button", { name: "Close" });
    const input = screen.getByLabelText("Brand");
    const apply = screen.getByRole("button", { name: "Apply" });

    expect(close).toHaveFocus();
    await userEvent.tab();
    expect(input).toHaveFocus();
    await userEvent.tab();
    expect(apply).toHaveFocus();
    await userEvent.tab(); // wraps
    expect(close).toHaveFocus();
    await userEvent.tab({ shift: true }); // wraps back
    expect(apply).toHaveFocus();
  });

  it("locks page scroll while open and restores it on close", async () => {
    document.body.style.overflow = "";
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open filters" }));
    expect(document.body.style.overflow).toBe("hidden");
    await userEvent.keyboard("{Escape}");
    expect(document.body.style.overflow).toBe("");
  });

  it("does not close on scrim click when dismissOnScrim is false", async () => {
    const onClose = vi.fn();
    render(
      <Sheet open title="Locked" onClose={onClose} dismissOnScrim={false}>
        <button>ok</button>
      </Sheet>,
    );
    await userEvent.click(screen.getByTestId("sheet-scrim"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
