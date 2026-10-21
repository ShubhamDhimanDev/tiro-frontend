import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("@/components/home/hero-finder", () => ({ HeroFinder: () => <div data-testid="finder" /> }));
vi.mock("@/components/layout/hero-art", () => ({ HeroArt: () => <div data-testid="art" /> }));

import { Hero } from "@/components/home/hero";

describe("Hero", () => {
  it("lists the three inclusions after the finder, as static text", () => {
    render(<Hero regoEnabled={false} />);
    const list = screen.getByRole("list", { name: "Included with every fitting" });
    const items = within(list).getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual(["At home, work or roadside", "Balancing included", "Old tyres recycled"]);
    // The ticks follow the finder in document order.
    expect(screen.getByTestId("finder").compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
