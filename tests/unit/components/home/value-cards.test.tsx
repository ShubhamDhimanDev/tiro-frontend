import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ValueCards } from "@/components/home/value-cards";
import { INFO_PAGES } from "@/lib/site/info-pages";

describe("ValueCards", () => {
  it("renders the four points as links to their info pages", () => {
    render(<ValueCards />);
    const links = within(screen.getByRole("list")).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/price-guarantee", "/payment-options", "/warranties", "/fleet"]);
    expect(screen.getByRole("link", { name: /Price-match guarantee/ })).toHaveAttribute("href", "/price-guarantee");
    expect(screen.getByRole("link", { name: /Flexible payment options/ })).toHaveAttribute("href", "/payment-options");
    expect(screen.getByRole("link", { name: /Warranties and returns/ })).toHaveAttribute("href", "/warranties");
    expect(screen.getByRole("link", { name: /Fleet and business/ })).toHaveAttribute("href", "/fleet");
  });

  it("only links to pages that exist in the info-page registry", () => {
    render(<ValueCards />);
    const paths = new Set<string>(Object.values(INFO_PAGES).map((p) => p.path));
    for (const a of within(screen.getByRole("list")).getAllByRole("link")) expect(paths.has(a.getAttribute("href")!)).toBe(true);
  });

  it("gives every card a title and a one-line description", () => {
    render(<ValueCards />);
    for (const li of within(screen.getByRole("list")).getAllByRole("listitem")) {
      const parts = li.querySelectorAll("a > span > span");
      expect(parts).toHaveLength(2);
      expect(parts[0].textContent!.length).toBeGreaterThan(0);
      expect(parts[1].textContent!.length).toBeGreaterThan(0);
    }
  });
});
