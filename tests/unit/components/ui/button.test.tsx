import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, buttonClassName } from "@/components/ui/button";

describe("Button", () => {
  it("renders a type=button by default and fires onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Book now</Button>);
    const btn = screen.getByRole("button", { name: "Book now" });
    expect(btn).toHaveAttribute("type", "button");
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is activatable from the keyboard", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Go" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("uses the green token for primary and black for secondary", () => {
    const { rerender } = render(<Button>A</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-green", "min-h-12");
    rerender(<Button variant="secondary">A</Button>);
    expect(screen.getByRole("button")).toHaveClass("border-black");
    rerender(<Button variant="gold">A</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-gold");
  });

  it("sm is 44px on touch (40px md+), md is 48px", () => {
    const { rerender } = render(<Button size="sm">A</Button>);
    expect(screen.getByRole("button")).toHaveClass("min-h-11", "md:min-h-10");
    rerender(<Button size="md">A</Button>);
    expect(screen.getByRole("button")).toHaveClass("min-h-12");
  });

  it("loading disables clicks, sets aria-busy and keeps the label", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Pay
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Pay" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("disabled blocks clicks and has no aria-busy", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Pay
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Pay" });
    expect(btn).toBeDisabled();
    expect(btn).not.toHaveAttribute("aria-busy");
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("buttonClassName can style a link and supports fullWidth", () => {
    expect(buttonClassName({ fullWidth: true })).toContain("w-full");
    expect(buttonClassName({ variant: "ghost" })).toContain("hover:bg-chip");
  });
});
