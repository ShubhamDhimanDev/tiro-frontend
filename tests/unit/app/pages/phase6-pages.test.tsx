import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { buildFixtureOffers } from "@/lib/offers/fixtures";
import { FIXTURE_LOCATION_TREE, buildFixtureCityDetail } from "@/lib/locations/fixtures";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  permanentRedirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/location/location-provider", () => ({
  useLocation: () => ({ zone: null, loading: false, setZone: vi.fn(), openPicker: vi.fn(), clearZone: vi.fn() }),
}));
vi.mock("@/lib/enquiries/client-api", () => ({ submitEnquiry: vi.fn(), THROTTLE_MESSAGE: "x" }));
// Sample content (design phase) can be switched off per test to exercise the true empty states.
const sample = vi.hoisted(() => ({ on: true }));
vi.mock("@/lib/site/sample", () => ({
  get SAMPLE_CONTENT_ENABLED() {
    return sample.on;
  },
  SAMPLE_NOTE: "Sample content for layout review.",
}));
vi.mock("@/lib/offers/backend", () => ({ offersBackend: { list: vi.fn(), detail: vi.fn() } }));
vi.mock("@/lib/locations/backend", () => ({ locationsBackend: { tree: vi.fn(), city: vi.fn() } }));
vi.mock("@/lib/content/backend", () => ({ contentBackend: { pages: vi.fn(), pageDetail: vi.fn(), faqs: vi.fn() } }));
vi.mock("@/lib/reviews/backend", () => ({ reviewsBackend: { list: vi.fn() } }));
// FaqBlock is an async server component (it fetches); a client-side test render cannot await it, so stand in for it.
vi.mock("@/components/content/faq-block", () => ({
  FaqBlock: ({ heading, limit }: { heading?: string; limit?: number }) => (
    <section data-testid="faq-block" data-limit={limit}>
      <h2>{heading}</h2>
      <p>Do you fit at home?</p>
    </section>
  ),
}));

import { offersBackend } from "@/lib/offers/backend";
import { locationsBackend } from "@/lib/locations/backend";
import { contentBackend } from "@/lib/content/backend";
import { reviewsBackend } from "@/lib/reviews/backend";
import DealsPage from "@/app/deals/page";
import OfferDetailPage from "@/app/deals/[slug]/page";
import LocationsPage from "@/app/locations/page";
import CityPage from "@/app/locations/[slug]/[city]/page";
import LegacyLocationPage from "@/app/locations/[slug]/page";
import ContactPage from "@/app/contact/page";

function ldJson(): Record<string, unknown>[] {
  return Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => JSON.parse(s.textContent ?? "{}"));
}

beforeEach(() => {
  sample.on = true;
  vi.mocked(offersBackend.list).mockResolvedValue({ status: 200, body: { data: buildFixtureOffers() } });
  vi.mocked(offersBackend.detail).mockImplementation(async (slug: string) => {
    const offer = buildFixtureOffers().find((o) => o.slug === slug);
    return offer ? { status: 200, body: { data: offer } } : { status: 404, body: { message: "Not Found" } };
  });
  vi.mocked(locationsBackend.tree).mockResolvedValue({ status: 200, body: { data: FIXTURE_LOCATION_TREE } });
  vi.mocked(locationsBackend.city).mockImplementation(async (s: string, c: string) => {
    const d = buildFixtureCityDetail(s, c);
    return d ? { status: 200, body: { data: d } } : { status: 404, body: { message: "Not Found" } };
  });
  vi.mocked(contentBackend.pages).mockResolvedValue({ status: 200, body: { data: [], meta: {}, links: {} } });
  vi.mocked(contentBackend.pageDetail).mockResolvedValue({ status: 404, body: {} });
  vi.mocked(contentBackend.faqs).mockResolvedValue({
    status: 200,
    body: { data: [{ id: 1, question: "Do you fit at home?", answer: "Yes, anywhere convenient.", category: null, sort_order: 1 }] },
  });
  vi.mocked(reviewsBackend.list).mockResolvedValue({
    status: 200,
    body: {
      data: [
        { id: 1, source: "google", author_name: "Sam", author_photo_url: null, rating: 5, body: "Great job at my place in Richmond.", reply_body: null, review_url: null, published_at: "2026-09-01T00:00:00Z" },
        { id: 2, source: "google", author_name: "Kim", author_photo_url: null, rating: 5, body: "Quick and tidy.", reply_body: null, review_url: null, published_at: "2026-09-02T00:00:00Z" },
      ],
      meta: { current_page: 1, per_page: 50, total: 2, summary: { average_rating: 5, total_count: 2 } },
    },
  });
});

describe("/deals", () => {
  it("renders API offers as HTML cards with the filter chips", async () => {
    render(await DealsPage());
    expect(screen.getByRole("heading", { level: 1, name: "Deals and offers" })).toBeInTheDocument();
    expect(screen.getAllByTestId("offer-card")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Bridgestone" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Shop this offer" })[0]).toHaveAttribute("href", "/tyres?brand=bridgestone");
  });

  it("shows marked sample offers while the API has none (design phase)", async () => {
    vi.mocked(offersBackend.list).mockResolvedValue({ status: 503, body: { message: "down" } });
    render(await DealsPage());
    expect(screen.getAllByTestId("offer-card").length).toBeGreaterThan(0);
    expect(screen.getByTestId("sample-note")).toHaveTextContent("Sample content");
    expect(screen.queryByTestId("offers-empty")).not.toBeInTheDocument();
  });

  it("shows a graceful empty state when there are no offers or the API fails (sample content off)", async () => {
    sample.on = false;
    vi.mocked(offersBackend.list).mockResolvedValue({ status: 503, body: { message: "down" } });
    render(await DealsPage());
    expect(screen.getByTestId("offers-empty")).toHaveTextContent("No offers running right now");
    expect(screen.queryByTestId("offer-card")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Ways to save" })).toBeInTheDocument();
  });
});

describe("/deals/[slug]", () => {
  it("shows the offer, its code, dates and terms", async () => {
    render(await OfferDetailPage({ params: Promise.resolve({ slug: "bridgestone-4-for-3" }) }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("4th free");
    expect(screen.getByTestId("offer-code")).toHaveTextContent("BRIDGESTONE4");
    expect(screen.getByRole("heading", { name: "Terms and conditions" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Shop this offer" })).toHaveAttribute("href", "/tyres?brand=bridgestone");
    expect(ldJson().some((d) => d["@type"] === "BreadcrumbList")).toBe(true);
  });

  it("404s for an unknown, ended or non-public offer", async () => {
    await expect(OfferDetailPage({ params: Promise.resolve({ slug: "nope" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("/locations", () => {
  it("lists states then cities from the API with the suburb checker", async () => {
    render(await LocationsPage());
    expect(screen.getByRole("heading", { level: 1, name: /Where we go/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Suburb or postcode")).toBeInTheDocument();
    const vic = screen.getByRole("region", { name: "Victoria" });
    const links = within(vic).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toEqual(["/locations/vic", "/locations/vic/geelong", "/locations/vic/melbourne"]);
    expect(screen.getByRole("region", { name: "New South Wales" })).toBeInTheDocument();
  });

  it("shows the marked sample tree while the API has no locations (design phase)", async () => {
    vi.mocked(locationsBackend.tree).mockResolvedValue({ status: 503, body: {} });
    render(await LocationsPage());
    expect(screen.getByRole("region", { name: "Victoria" })).toBeInTheDocument();
    expect(screen.getByTestId("sample-note")).toBeInTheDocument();
    expect(screen.queryByTestId("locations-empty")).not.toBeInTheDocument();
  });

  it("falls back to an empty state but keeps the checker when the API is down (sample content off)", async () => {
    sample.on = false;
    vi.mocked(locationsBackend.tree).mockResolvedValue({ status: 503, body: {} });
    render(await LocationsPage());
    expect(screen.getByTestId("locations-empty")).toBeInTheDocument();
    expect(screen.getByLabelText("Suburb or postcode")).toBeInTheDocument();
  });
});

describe("/locations/[state]/[city]", () => {
  const params = (state: string, city: string) => ({ params: Promise.resolve({ slug: state, city }) });

  it("renders the city page: H1, three ticks, finder, suburbs, coverage notes, FAQs, service-area links, photo fallback", async () => {
    render(await CityPage(params("vic", "melbourne")));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Melbourne, Victoria");
    expect(screen.getByRole("list", { name: /Why choose us in Melbourne/ }).querySelectorAll("li")).toHaveLength(3);
    expect(screen.getByRole("tablist", { name: /find your tyres/i })).toBeInTheDocument();
    expect(screen.getByTestId("city-photo")).toHaveClass("asphalt-texture");
    expect(screen.getByRole("list", { name: "Suburbs in Melbourne" }).querySelectorAll("li")).toHaveLength(3);
    expect(screen.getByText(/we travel up to 25 km/)).toBeInTheDocument();
    expect(screen.getByTestId("faq-block")).toHaveAttribute("data-limit", "6");
    expect(screen.getByRole("heading", { name: "Questions about mobile fitting in Melbourne" })).toBeInTheDocument();
    const areas = within(screen.getByRole("region", { name: "Other areas we service" })).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(areas).toContain("/locations/vic/geelong");
    expect(areas).toContain("/locations/nsw/sydney");
    expect(areas).not.toContain("/locations/vic/melbourne");
  });

  it("shows only reviews that mention the city or a suburb", async () => {
    render(await CityPage(params("vic", "melbourne")));
    const section = screen.getByRole("region", { name: "Customers who mentioned Melbourne" });
    expect(within(section).getByText(/Great job at my place in Richmond/)).toBeInTheDocument();
    expect(within(section).queryByText(/Quick and tidy/)).not.toBeInTheDocument();
  });

  it("omits the reviews block when none are local", async () => {
    vi.mocked(reviewsBackend.list).mockResolvedValue({ status: 200, body: { data: [], meta: { summary: { average_rating: 0, total_count: 0 } } } });
    render(await CityPage(params("vic", "melbourne")));
    expect(screen.queryByRole("region", { name: /Customers who mentioned/ })).not.toBeInTheDocument();
  });

  it("emits LocalBusiness and BreadcrumbList structured data (FAQPage comes from the FAQ block)", async () => {
    render(await CityPage(params("vic", "melbourne")));
    const data = ldJson();
    const business = data.find((d) => d["@type"] === "LocalBusiness") as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(business).toMatchObject({
      name: "Tiro Mobile Tyres, Melbourne",
      areaServed: "Melbourne, Victoria",
      url: "http://localhost:3000/locations/vic/melbourne",
      address: { "@type": "PostalAddress", addressLocality: "Melbourne", addressRegion: "VIC", addressCountry: "AU" },
    });
    expect(business.openingHoursSpecification[0]).toMatchObject({ opens: "07:00", closes: "18:00", dayOfWeek: ["Monday", "Tuesday"] });
    expect(data.some((d) => d["@type"] === "BreadcrumbList")).toBe(true);
  });

  it("shows the CMS body as About copy when the API returns linked content", async () => {
    const detail = buildFixtureCityDetail("vic", "melbourne")!;
    detail.content = {
      title: "Mobile tyres in Melbourne",
      slug: "melbourne-mobile-tyres",
      excerpt: "We come to you.",
      body: "<h2>Local know-how</h2><p>Authored copy. Our vans cover the whole city every day of the week, carrying a full range of passenger and 4x4 tyres so most jobs are finished in one visit.</p>",
      featured_image_path: null,
      meta_title: null,
      meta_description: null,
      updated_at: "2026-09-30T02:11:00+00:00",
    };
    vi.mocked(locationsBackend.city).mockResolvedValue({ status: 200, body: { data: detail } });
    render(await CityPage(params("vic", "melbourne")));
    expect(screen.getByText(/Authored copy./)).toBeInTheDocument();
    expect(screen.getByText("We come to you.")).toBeInTheDocument();
  });

  it("404s for a pair that is not a served city", async () => {
    await expect(CityPage(params("vic", "atlantis"))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("old /locations/[slug] URLs", () => {
  it("redirects a slug with no CMS page to the matching state/city page", async () => {
    await expect(LegacyLocationPage({ params: Promise.resolve({ slug: "melbourne" }) })).rejects.toThrow("REDIRECT:/locations/vic/melbourne");
    await expect(LegacyLocationPage({ params: Promise.resolve({ slug: "vic-geelong" }) })).rejects.toThrow("REDIRECT:/locations/vic/geelong");
  });
  it("still 404s for a slug that is neither a CMS page nor a city", async () => {
    await expect(LegacyLocationPage({ params: Promise.resolve({ slug: "not-a-real-location-slug" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("/contact", () => {
  it("has the three-way form with the phone alongside", () => {
    render(<ContactPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Contact", "Get a quote", "Fleet enquiry"]);
    expect(screen.getAllByRole("link", { name: /\d{4} \d{3} \d{3}/ })[0]).toHaveAttribute("href", expect.stringMatching(/^tel:/));
  });
});
