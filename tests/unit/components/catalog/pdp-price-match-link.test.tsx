import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PdpPriceMatchLink } from "@/components/catalog/pdp-price-match-link";

/**
 * `PdpPriceMatchLink` — per its own docblock, renders nothing at all while
 * auth is resolving or signed out (no useful guest action to offer; the
 * form itself has its own redundant sign-in gate for anyone who reaches
 * `/price-guarantee-claims/new` another way), and renders a real link with
 * the right `tyre_variant_id`/`label` query params when signed in. No prior
 * coverage of this component existed at all before this file.
 */
vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseAuth = vi.fn();

describe("PdpPriceMatchLink", () => {
  it("renders nothing while auth is still resolving", () => {
    mockUseAuth.mockReturnValue({ customer: null, loading: true });
    const { container } = render(<PdpPriceMatchLink tyreVariantId={5} label="Bridgestone Turanza T005 205/55 R16" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when signed out", () => {
    mockUseAuth.mockReturnValue({ customer: null, loading: false });
    const { container } = render(<PdpPriceMatchLink tyreVariantId={5} label="Bridgestone Turanza T005 205/55 R16" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders a link with the right tyre_variant_id and label query params when signed in", () => {
    mockUseAuth.mockReturnValue({ customer: { id: 1, name: "Jess Nguyen", email: "jess@example.com", mobile: null }, loading: false });
    render(<PdpPriceMatchLink tyreVariantId={5} label="Bridgestone Turanza T005 205/55 R16" />);

    const link = screen.getByRole("link", { name: /Found it cheaper\? Claim a price match/ });
    const href = link.getAttribute("href")!;
    expect(href.startsWith("/price-guarantee-claims/new?")).toBe(true);

    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("tyre_variant_id")).toBe("5");
    expect(params.get("label")).toBe("Bridgestone Turanza T005 205/55 R16");
  });

  it("encodes a different tyre_variant_id/label pair correctly (guards against a hardcoded/stale query string)", () => {
    mockUseAuth.mockReturnValue({ customer: { id: 2, name: "Sam Lee", email: "sam@example.com", mobile: null }, loading: false });
    render(<PdpPriceMatchLink tyreVariantId={123} label="Michelin Primacy 4 215/55 R17" />);

    const link = screen.getByRole("link", { name: /Found it cheaper\? Claim a price match/ });
    const params = new URLSearchParams(link.getAttribute("href")!.split("?")[1]);
    expect(params.get("tyre_variant_id")).toBe("123");
    expect(params.get("label")).toBe("Michelin Primacy 4 215/55 R17");
  });
});
