import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const subscribe = vi.fn();
vi.mock("@/lib/newsletter/client-api", () => ({ subscribeNewsletter: (...a: unknown[]) => subscribe(...a) }));

import { OffersCarousel } from "@/components/home/offers-carousel";
import { BrandsBand } from "@/components/home/brands-band";
import { ReviewsSection } from "@/components/home/reviews";
import { UspStrip } from "@/components/home/usp-strip";
import { Newsletter } from "@/components/home/newsletter";
import type { Offer } from "@/lib/offers/types";

const offer = (over: Partial<Offer> = {}): Offer => ({
  id: 1,
  slug: "four-for-three",
  title: "Buy 3, get the 4th free",
  summary: "On selected sets.",
  brand: null,
  discount_description: "Fourth tyre free",
  badge_text: "4 for 3",
  code: null,
  starts_at: "2026-09-01",
  ends_at: "2026-12-30",
  terms: null,
  image_path: null,
  shop_filters: {},
  zone_ids: [],
  ...over,
});

describe("home sections hide when the API has nothing", () => {
  it("renders nothing for no offers, brands or reviews", () => {
    const { container } = render(
      <>
        <OffersCarousel offers={[]} />
        <BrandsBand brands={[]} />
        <ReviewsSection data={{ reviews: [], summary: null }} />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("home live data", () => {
  it("links offer tiles to their detail page using the API badge and title", () => {
    render(<OffersCarousel offers={[offer()]} />);
    const link = screen.getByRole("link", { name: /Buy 3, get the 4th free/ });
    expect(link).toHaveAttribute("href", "/deals/four-for-three");
    expect(link).toHaveTextContent("4 for 3");
  });

  it("shows an offer's feature image as the whole tile, with the offer text kept for screen readers", () => {
    const { container } = render(
      <OffersCarousel offers={[offer({ image_path: "https://cdn.example.test/offer.webp", discount_description: "Fourth tyre free" })]} />,
    );
    expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.example.test/offer.webp");
    const link = screen.getByRole("link", { name: /Buy 3, get the 4th free/ });
    expect(link).toHaveAttribute("href", "/deals/four-for-three");
    expect(link).toHaveTextContent("Fourth tyre free");
    expect(screen.queryByText("4 for 3")).not.toBeInTheDocument();
  });

  it("links brands to their brand page", () => {
    render(<BrandsBand brands={[{ name: "Michelin", slug: "michelin" }]} />);
    expect(screen.getByRole("link", { name: "Michelin" })).toHaveAttribute("href", "/brands/michelin");
  });

  it("shows a brand's uploaded logo beside its name, and the name alone for brands without one", () => {
    render(
      <BrandsBand
        brands={[
          { name: "Accelera", slug: "accelera", logo: "http://localhost:8000/storage/media/accelera.webp" },
          { name: "Michelin", slug: "michelin", logo: null },
        ]}
      />,
    );
    const accelera = screen.getByRole("link", { name: "Accelera" });
    expect(accelera).toHaveAttribute("href", "/brands/accelera");
    expect(accelera).toHaveTextContent("Accelera");
    expect(accelera.querySelector("img")).toHaveAttribute("src", "http://localhost:8000/storage/media/accelera.webp");
    const michelin = screen.getByRole("link", { name: "Michelin" });
    expect(michelin).toHaveTextContent("Michelin");
    expect(michelin.querySelector("img")).toBeNull();
  });

  it("shows the API rating only when a summary exists", () => {
    const { rerender } = render(<UspStrip />);
    expect(screen.queryByText(/out of 5/)).not.toBeInTheDocument();
    rerender(<UspStrip summary={{ average_rating: 4.6, total_count: 12 }} />);
    expect(screen.getByText("Rated 4.6 out of 5")).toBeInTheDocument();
  });

  it("renders review text and author, without a sample footnote", () => {
    render(
      <ReviewsSection
        data={{
          reviews: [
            {
              id: 1,
              source: "google",
              author_name: "Sam",
              author_photo_url: null,
              rating: 5,
              body: "Great job.",
              reply_body: null,
              review_url: null,
              published_at: "2026-09-01T00:00:00Z",
            },
          ],
          summary: { average_rating: 5, total_count: 1 },
        }}
      />,
    );
    expect(screen.getByText("Great job.")).toBeInTheDocument();
    expect(screen.getByText("Sam")).toBeInTheDocument();
    expect(screen.getByText(/1 Google review$/)).toBeInTheDocument();
    expect(screen.queryByText(/sample/i)).not.toBeInTheDocument();
  });
});

describe("Newsletter", () => {
  it("validates the email before calling the API", async () => {
    subscribe.mockReset();
    render(<Newsletter />);
    await userEvent.type(screen.getByLabelText("Email"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("posts the signup and shows the server message on success", async () => {
    subscribe.mockReset().mockResolvedValue({ kind: "success", message: "Thanks, you are on the list." });
    render(<Newsletter />);
    await userEvent.type(screen.getByLabelText("Email"), "a@b.co");
    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(subscribe).toHaveBeenCalledWith({ email: "a@b.co", first_name: undefined, source: "home", website: "" });
    expect(await screen.findByTestId("newsletter-success")).toHaveTextContent("on the list");
  });

  it("shows an alert when the API fails and keeps the form", async () => {
    subscribe.mockReset().mockResolvedValue({ kind: "error", message: "Something went wrong on our side." });
    render(<Newsletter />);
    await userEvent.type(screen.getByLabelText("Email"), "a@b.co");
    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("went wrong");
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeInTheDocument();
  });
});
