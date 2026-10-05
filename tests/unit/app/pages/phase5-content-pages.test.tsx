import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
vi.mock("@/lib/locations/backend", () => ({ locationsBackend: { tree: vi.fn(), city: vi.fn() } }));
vi.mock("@/lib/content/backend", () => ({ contentBackend: { pages: vi.fn(), pageDetail: vi.fn(), faqs: vi.fn() } }));
vi.mock("@/lib/reviews/backend", () => ({ reviewsBackend: { list: vi.fn().mockResolvedValue({ status: 503, body: {} }) } }));

import { locationsBackend } from "@/lib/locations/backend";
import { contentBackend } from "@/lib/content/backend";
import SuburbPage, { generateMetadata as suburbMetadata } from "@/app/locations/[slug]/[city]/[suburb]/page";
import StateOrCmsLocationPage from "@/app/locations/[slug]/page";
import ServicePage from "@/app/services/[slug]/page";
import ServicesPage from "@/app/services/page";
import { INFO_PAGES } from "@/lib/site/info-pages";
import { InfoPage } from "@/components/page/info-page";

function ldJson(): Record<string, unknown>[] {
  return Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => JSON.parse(s.textContent ?? "{}"));
}

beforeEach(() => {
  vi.mocked(locationsBackend.tree).mockResolvedValue({ status: 200, body: { data: FIXTURE_LOCATION_TREE } });
  vi.mocked(locationsBackend.city).mockImplementation(async (s: string, c: string) => {
    const d = buildFixtureCityDetail(s, c);
    return d ? { status: 200, body: { data: d } } : { status: 404, body: {} };
  });
  vi.mocked(contentBackend.pageDetail).mockResolvedValue({ status: 404, body: {} });
  vi.mocked(contentBackend.pages).mockResolvedValue({ status: 200, body: { data: [], meta: {}, links: {} } });
  vi.mocked(contentBackend.faqs).mockResolvedValue({ status: 200, body: { data: [] } });
});

describe("/locations/[state] (state level)", () => {
  it("lists the cities in the state when no CMS page matches the slug", async () => {
    render(await StateOrCmsLocationPage({ params: Promise.resolve({ slug: "vic" }) }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Mobile tyres in Victoria");
    const links = within(screen.getByRole("region", { name: "Cities we service in Victoria" })).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toEqual(["/locations/vic/geelong", "/locations/vic/melbourne"]);
    expect(ldJson().some((d) => d["@type"] === "BreadcrumbList")).toBe(true);
  });
});

describe("/locations/[state]/[city]/[suburb]", () => {
  const params = (suburb: string) => ({ params: Promise.resolve({ slug: "vic", city: "melbourne", suburb }) });

  it("renders the suburb page with LocalBusiness + breadcrumb data and neighbours", async () => {
    render(await SuburbPage(params("richmond")));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tyres Richmond locals trust");
    const business = ldJson().find((d) => d["@type"] === "LocalBusiness") as Record<string, unknown>;
    expect(business).toMatchObject({ areaServed: "Richmond, Victoria", url: "http://localhost:3000/locations/vic/melbourne/richmond" });
    const nearby = within(screen.getByRole("region", { name: "Also in Melbourne" })).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(nearby).toContain("/locations/vic/melbourne/st-kilda");
    expect(nearby).not.toContain("/locations/vic/melbourne/richmond");
  });

  it("canonicalises to the city page (thin near-duplicate pages)", async () => {
    const meta = await suburbMetadata(params("richmond"));
    expect(meta.alternates?.canonical).toBe("/locations/vic/melbourne");
  });

  it("404s for a suburb that is not in the city list", async () => {
    await expect(SuburbPage(params("atlantis"))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("/services", () => {
  it("lists every service as a band with a link to its page (fleet to /fleet)", async () => {
    render(await ServicesPage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Everything your tyres need");
    expect(screen.getByRole("link", { name: /Learn more about onsite fitting/i })).toHaveAttribute("href", "/services/onsite-fitting");
    expect(screen.getByRole("link", { name: /Learn more about fleet/i })).toHaveAttribute("href", "/fleet");
  });

  it("a service page emits Service, FAQPage and breadcrumb structured data", async () => {
    render(await ServicePage({ params: Promise.resolve({ slug: "puncture-repair" }) }));
    const types = ldJson().map((d) => d["@type"]);
    expect(types).toEqual(expect.arrayContaining(["Service", "FAQPage", "BreadcrumbList"]));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Puncture repair");
  });

  it("the old fleet service URL redirects to /fleet", async () => {
    await expect(ServicePage({ params: Promise.resolve({ slug: "fleet" }) })).rejects.toThrow("REDIRECT:/fleet");
  });
});

describe("InfoPage template", () => {
  it("renders hero, bands, FAQ with FAQPage JSON-LD, and renders no placeholder slot when no real image is set", () => {
    const { container } = render(<InfoPage page={INFO_PAGES["price-guarantee"]} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Our price guarantee");
    expect(screen.getByRole("button", { name: /Do I need an account/ })).toBeInTheDocument();
    // Slots without a real `src` render nothing (WS-B), never an orphan placeholder block.
    expect(container.querySelector("[data-image-slot]")).toBeNull();
    const types = ldJson().map((d) => d["@type"]);
    expect(types).toEqual(expect.arrayContaining(["FAQPage", "BreadcrumbList"]));
  });
});
