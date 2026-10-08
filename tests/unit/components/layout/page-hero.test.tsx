import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHero } from "@/components/layout/page-hero";

// The real hero photos are wired in `lib/site/images.ts`; these tests cover the no-photo fallback.
vi.mock("@/lib/site/images", () => ({ HERO_IMAGES: { desktop: null, mobile: null } }));

describe("PageHero", () => {
  it("renders exactly one h1 with the title, intro and children", () => {
    render(
      <PageHero title="Deals and offers" intro="What is on now">
        <div>finder card</div>
      </PageHero>,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Deals and offers" })).toBeInTheDocument();
    expect(screen.getByText("What is on now")).toBeInTheDocument();
    expect(screen.getByText("finder card")).toBeInTheDocument();
  });

  it("renders the chevron and van fallback when there is no image", () => {
    const { container } = render(<PageHero title="T" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg text")?.textContent).toBe("TIRO");
    expect(container.querySelectorAll(".hero-bar-in")).toHaveLength(3);
  });

  it("renders a decorative image (alt empty) in place of the fallback, and a labelled one when alt is given", () => {
    const { container, rerender } = render(<PageHero title="T" image={{ src: "/images/x.webp" }} />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("alt")).toBe("");
    expect(container.querySelector(".hero-van-in")).toBeNull();

    rerender(<PageHero title="T" image={{ src: "/images/x.webp", alt: "A Tiro van" }} />);
    expect(screen.getByAltText("A Tiro van")).toBeInTheDocument();
  });

  it("renders breadcrumbs when crumbs are passed", () => {
    render(
      <PageHero
        title="Deals"
        crumbs={[
          { name: "Home", url: "/" },
          { name: "Deals", url: "/deals" },
        ]}
      />,
    );
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});
