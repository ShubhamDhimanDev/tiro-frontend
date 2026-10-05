import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrustStrip } from "@/components/home/trust-strip";
import { TRUST_BADGES } from "@/lib/site/trust-badges";

describe("TrustStrip", () => {
  it("ships with no badges configured, so the default render is empty", () => {
    expect(TRUST_BADGES).toHaveLength(0);
    const { container } = render(<TrustStrip />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for empty badges and no summary", () => {
    const { container } = render(<TrustStrip badges={[]} summary={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders configured badges, linking out safely", () => {
    render(
      <TrustStrip
        badges={[
          { label: "Accredited", src: "/images/badges/a.svg", href: "https://example.com" },
          { label: "Award", src: "/images/badges/b.svg" },
        ]}
      />,
    );
    expect(screen.getByAltText("Accredited").closest("a")).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByAltText("Award").closest("a")).toBeNull();
  });

  it("renders the review summary when provided", () => {
    render(<TrustStrip badges={[]} summary={{ average_rating: 4.6, total_count: 24 }} />);
    expect(screen.getByText("Rated 4.6 out of 5")).toBeInTheDocument();
    expect(screen.getByText("24 Google reviews")).toBeInTheDocument();
  });
});
