import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { HeroArt } from "@/components/layout/hero-art";
import { HERO_IMAGES } from "@/lib/site/images";

describe("HeroArt", () => {
  it("never gives phones a real desktop image URL: the <img> is a data URI and the photo sits in a >=992px <source>", () => {
    const { container } = render(<HeroArt />);
    const source = container.querySelector("picture source");
    expect(source?.getAttribute("media")).toBe("(min-width: 992px)");
    expect(source?.getAttribute("srcset")).toBe(HERO_IMAGES.desktop?.src);
    const imgs = [...container.querySelectorAll("img")];
    expect(imgs).toHaveLength(1);
    expect(imgs[0].getAttribute("src")).toMatch(/^data:image\/gif/);
    expect(imgs[0].getAttribute("alt")).toBe(HERO_IMAGES.desktop?.alt);
  });

  it("shows no phone banner by default, so content-page heroes stay compact", () => {
    const { container } = render(<HeroArt />);
    expect(container.querySelector("img[src*='hero-van-mobile']")).toBeNull();
    expect(container.querySelector(".lg\\:hidden")).toBeNull();
  });

  it("shows the square van photo as a phone-only banner when `mobile` is set", () => {
    const { container } = render(<HeroArt mobile />);
    const banner = container.querySelector("img[src*='hero-van-mobile']");
    expect(banner).not.toBeNull();
    expect(banner?.getAttribute("alt")).toBe(HERO_IMAGES.mobile?.alt);
    expect(banner?.closest(".lg\\:hidden")).not.toBeNull();
  });
});
