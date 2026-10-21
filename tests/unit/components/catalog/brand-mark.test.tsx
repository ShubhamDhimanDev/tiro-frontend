import { afterEach, describe, expect, it } from "vitest";
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

  describe("an image that already failed before React attached its error handler (404 during hydration)", () => {
    const proto = HTMLImageElement.prototype;
    const original = { complete: Object.getOwnPropertyDescriptor(proto, "complete"), naturalWidth: Object.getOwnPropertyDescriptor(proto, "naturalWidth") };
    const fake = (complete: boolean, naturalWidth: number) => {
      Object.defineProperty(proto, "complete", { configurable: true, get: () => complete });
      Object.defineProperty(proto, "naturalWidth", { configurable: true, get: () => naturalWidth });
    };
    afterEach(() => {
      for (const key of ["complete", "naturalWidth"] as const) {
        if (original[key]) Object.defineProperty(proto, key, original[key]!);
        else delete (proto as unknown as Record<string, unknown>)[key];
      }
    });

    it("swaps to the fallback on mount when the image is complete with no pixels, without any error event", () => {
      fake(true, 0);
      render(<BrandMark logoPath="https://cdn.example.com/404.webp" name="Accelera">Fallback name</BrandMark>);
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.getByText("Fallback name")).toBeInTheDocument();
    });

    it("keeps the logo when it is still loading, or has loaded with pixels", () => {
      fake(false, 0);
      const { unmount } = render(<BrandMark logoPath="https://cdn.example.com/a.webp" name="Accelera">Fallback name</BrandMark>);
      expect(screen.getByRole("img", { name: "Accelera" })).toBeInTheDocument();
      unmount();
      fake(true, 120);
      render(<BrandMark logoPath="https://cdn.example.com/a.webp" name="Accelera">Fallback name</BrandMark>);
      expect(screen.getByRole("img", { name: "Accelera" })).toBeInTheDocument();
    });
  });

  it("is hidden from assistive tech when decorative", () => {
    const { container } = render(<BrandMark logoPath="https://cdn.example.com/a.webp" name="Accelera" decorative />);
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });
});
