import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BrandMark } from "@/components/catalog/brand-mark";
import { brandLogoSrc } from "@/lib/catalog/brand-logo";

describe("brandLogoSrc", () => {
  it("accepts absolute and root-relative URLs", () => {
    expect(brandLogoSrc("https://cdn.example.com/a.webp")).toBe("https://cdn.example.com/a.webp");
    expect(brandLogoSrc("http://localhost:8000/storage/media/a.webp")).toBe("http://localhost:8000/storage/media/a.webp");
    expect(brandLogoSrc("/brands/a.svg")).toBe("/brands/a.svg");
  });

  it("treats empty, missing and host-less storage paths as no logo", () => {
    expect(brandLogoSrc(null)).toBeNull();
    expect(brandLogoSrc(undefined)).toBeNull();
    expect(brandLogoSrc("  ")).toBeNull();
    expect(brandLogoSrc("brands/a.png")).toBeNull();
  });
});

describe("BrandMark", () => {
  it("renders the logo with the brand name as its alt text", () => {
    render(<BrandMark logoPath="https://cdn.example.com/a.webp" name="Accelera">Accelera</BrandMark>);
    expect(screen.getByRole("img", { name: "Accelera" })).toHaveAttribute("src", "https://cdn.example.com/a.webp");
    expect(screen.queryByText("Accelera")).not.toBeInTheDocument();
  });

  it("renders the fallback when the brand has no logo", () => {
    render(<BrandMark logoPath={null} name="Accelera">Fallback name</BrandMark>);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Fallback name")).toBeInTheDocument();
  });

  it("swaps to the fallback when the image fails to load", () => {
    render(<BrandMark logoPath="https://cdn.example.com/missing.webp" name="Accelera">Fallback name</BrandMark>);
    fireEvent.error(screen.getByRole("img", { name: "Accelera" }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Fallback name")).toBeInTheDocument();
  });

  it("is hidden from assistive tech when decorative", () => {
    const { container } = render(<BrandMark logoPath="https://cdn.example.com/a.webp" name="Accelera" decorative />);
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });
});
