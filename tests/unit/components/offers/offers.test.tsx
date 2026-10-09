import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OfferCard } from "@/components/offers/offer-card";
import { OffersHub, type HubOffer } from "@/components/offers/offers-hub";
import type { Offer } from "@/lib/offers/types";

const offer = (over: Partial<Offer> = {}): Offer => ({
  id: 1,
  slug: "bridgestone-4-for-3",
  title: "Buy 3 Bridgestone tyres, get the 4th free",
  summary: "Fit a full set and the cheapest one is on us.",
  brand: { name: "Bridgestone", slug: "bridgestone", logo_path: null },
  discount_description: "Fourth tyre free",
  badge_text: "4 for 3",
  code: "BRIDGESTONE4",
  starts_at: "2026-09-29",
  ends_at: "2026-12-30",
  terms: "Seed placeholder terms.",
  image_path: null,
  shop_filters: { brand: "bridgestone" },
  zone_ids: [],
  ...over,
});

const hub = (over: Partial<HubOffer> = {}): HubOffer => ({ ...offer(), endsSoon: false, ...over });

describe("OfferCard", () => {
  it("shows brand, what you get, end date, code, a terms disclosure and Shop this offer", () => {
    render(<OfferCard offer={offer()} />);
    const card = screen.getByTestId("offer-card");
    expect(within(card).getByRole("heading", { name: /4th free/ })).toBeInTheDocument();
    expect(within(card).getByText("Bridgestone")).toBeInTheDocument();
    expect(within(card).getByText("Fourth tyre free")).toBeInTheDocument();
    expect(within(card).getByText("Ends 30 Dec")).toBeInTheDocument();
    expect(within(card).getByText("BRIDGESTONE4")).toBeInTheDocument();
    expect(within(card).getByText("Terms and conditions")).toBeInTheDocument();
    expect(within(card).getByText("Seed placeholder terms.")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Shop this offer" })).toHaveAttribute("href", "/tyres?brand=bridgestone");
    expect(within(card).getByRole("link", { name: /Details for/ })).toHaveAttribute("href", "/deals/bridgestone-4-for-3");
  });

  it("has no code row for an auto-applied offer and no terms block when there are none", () => {
    render(<OfferCard offer={offer({ code: null, terms: null, brand: null, shop_filters: {} })} />);
    expect(screen.queryByText("Code")).not.toBeInTheDocument();
    expect(screen.queryByText("Terms and conditions")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Shop this offer" })).toHaveAttribute("href", "/tyres");
  });

  it("marks an offer ending soon, and a compact card drops the terms", () => {
    render(<OfferCard offer={offer()} endsSoon compact />);
    expect(screen.getByText("Ends soon")).toBeInTheDocument();
    expect(screen.queryByText("Terms and conditions")).not.toBeInTheDocument();
  });
});

describe("OfferCard feature image", () => {
  it("shows the feature image in place of the coloured badge tile, and keeps the text below it", () => {
    const { container } = render(<OfferCard offer={offer({ image_path: "https://cdn.example.test/offer.webp" })} />);
    expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.example.test/offer.webp");
    expect(screen.getByRole("heading", { name: /4th free/ })).toBeInTheDocument();
    expect(screen.queryByText("4 for 3")).not.toBeInTheDocument();
  });

  it("keeps the badge tile when there is no usable image (none, or a bare storage path with no host)", () => {
    for (const image_path of [null, "", "offers/spring.webp"]) {
      const { container, unmount } = render(<OfferCard offer={offer({ image_path })} />);
      expect(container.querySelector("img")).toBeNull();
      expect(screen.getByText("4 for 3")).toBeInTheDocument();
      unmount();
    }
  });
});

describe("OffersHub", () => {
  const offers = [
    hub({ id: 1, slug: "a", title: "Bridgestone offer", endsSoon: true }),
    hub({ id: 2, slug: "b", title: "Michelin SUV offer", brand: { name: "Michelin", slug: "michelin", logo_path: null }, shop_filters: { brand: "michelin", category: "suv" } }),
    hub({ id: 3, slug: "c", title: "Welcome offer", brand: null, shop_filters: {} }),
  ];

  it("filters by brand, type and ends soon, and reports the count", async () => {
    const user = userEvent.setup();
    render(<OffersHub offers={offers} />);
    expect(screen.getAllByTestId("offer-card")).toHaveLength(3);
    expect(screen.getByTestId("offer-count")).toHaveTextContent("3 offers");

    await user.click(screen.getByRole("button", { name: "Michelin" }));
    expect(screen.getByRole("button", { name: "Michelin" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByTestId("offer-card")).toHaveLength(1);
    expect(screen.getByTestId("offer-count")).toHaveTextContent("1 offer");

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await user.click(screen.getByRole("button", { name: "SUV" }));
    expect(screen.getAllByTestId("offer-card")).toHaveLength(1);
    expect(screen.getByText("Michelin SUV offer")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await user.click(screen.getByRole("button", { name: "Ends soon" }));
    expect(screen.getAllByTestId("offer-card")).toHaveLength(1);
    expect(screen.getByText("Bridgestone offer")).toBeInTheDocument();
  });

  it("shows a way back when filters match nothing", async () => {
    const user = userEvent.setup();
    render(<OffersHub offers={offers} />);
    await user.click(screen.getByRole("button", { name: "Michelin" }));
    await user.click(screen.getByRole("button", { name: "Ends soon" }));
    expect(screen.getByText("No offers match those filters.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show all offers" }));
    expect(screen.getAllByTestId("offer-card")).toHaveLength(3);
  });

  it("hides the filter chips for a single offer", () => {
    render(<OffersHub offers={[offers[0]]} />);
    expect(screen.queryByTestId("offer-filters")).not.toBeInTheDocument();
  });
});
