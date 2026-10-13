import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * Location wording and form defaults come from the admin's served area
 * (`<CoverageProvider>`), never from a hardcoded place.
 */
vi.mock("@/components/location/location-provider", () => ({ useLocation: () => ({ setZone: vi.fn() }) }));
vi.mock("@/lib/location/client-api", () => ({ locationApi: { check: vi.fn() } }));
const loadLocationTree = vi.fn();
vi.mock("@/lib/locations/helpers", async (orig) => ({ ...(await orig<typeof import("@/lib/locations/helpers")>()), loadLocationTree: (...a: unknown[]) => loadLocationTree(...a) }));
const locationImage = vi.fn();
vi.mock("@/lib/site/images", () => ({ locationImage: (...a: unknown[]) => locationImage(...a) }));

import { CoverageProvider } from "@/components/location/coverage-provider";
import { CoverageChecker } from "@/components/home/coverage-checker";
import { LocationCaptureForm } from "@/components/location/location-capture-form";
import { AddressAutocomplete } from "@/components/checkout/address-autocomplete";
import { DealsOnline } from "@/components/home/deals-online";
import { ServiceJsonLd } from "@/components/seo/json-ld";
import { CityPhoto } from "@/components/locations/city-photo";
import { EMPTY_COVERAGE, summariseCoverage, type CoverageSummary } from "@/lib/locations/coverage";
import type { LocationState } from "@/lib/locations/types";

const TREE: LocationState[] = [
  {
    code: "VIC",
    name: "Victoria",
    slug: "vic",
    city_count: 1,
    suburb_count: 2,
    cities: [
      {
        name: "Melbourne",
        slug: "melbourne",
        service_zone_id: 1,
        service_zone_ids: [1],
        suburb_count: 2,
        suburbs: [
          { name: "Melbourne", slug: "melbourne", postcode: "3000", service_zone_id: 1 },
          { name: "Richmond", slug: "richmond", postcode: "3121", service_zone_id: 1 },
        ],
      },
    ],
  },
];
const MELBOURNE: CoverageSummary = summariseCoverage(TREE);

const withCoverage = (value: CoverageSummary, ui: ReactNode) => <CoverageProvider value={value}>{ui}</CoverageProvider>;

describe("home coverage checker", () => {
  it("names the served city and uses a served postcode in the hint", () => {
    render(withCoverage(MELBOURNE, <CoverageChecker />));
    expect(screen.getByRole("heading", { name: "We come to you in Melbourne" })).toBeInTheDocument();
    expect(screen.getByText("Or a 4-digit postcode, like 3121.")).toBeInTheDocument();
    expect(screen.queryByText(/nationwide/i)).not.toBeInTheDocument();
  });

  it("stays neutral, naming no place, when the admin serves nothing", () => {
    render(withCoverage(EMPTY_COVERAGE, <CoverageChecker />));
    expect(screen.getByRole("heading", { name: "Do we come to you?" })).toBeInTheDocument();
    expect(screen.getByText("Or a 4-digit postcode.")).toBeInTheDocument();
  });
});

describe("shared suburb or postcode form", () => {
  it("shows an example from the served area", () => {
    render(withCoverage(MELBOURNE, <LocationCaptureForm />));
    expect(screen.getByText("e.g. Richmond or 3121")).toBeInTheDocument();
  });

  it("shows no example place when nothing is served", () => {
    render(withCoverage(EMPTY_COVERAGE, <LocationCaptureForm />));
    expect(screen.getByText("Enter your suburb or a 4-digit postcode")).toBeInTheDocument();
    expect(screen.queryByText(/richmond/i)).not.toBeInTheDocument();
  });
});

describe("delivery address state list", () => {
  const options = () => Array.from(screen.getByLabelText(/^State/).querySelectorAll("option")).map((o) => o.textContent);

  it("offers only the served state", () => {
    render(withCoverage(MELBOURNE, <AddressAutocomplete onSelect={() => {}} />));
    expect(options()).toEqual(["Select", "VIC"]);
  });

  it("offers every state while the API gives nothing", () => {
    render(withCoverage(EMPTY_COVERAGE, <AddressAutocomplete onSelect={() => {}} />));
    expect(options()).toEqual(["Select", "ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]);
  });
});

describe("home 'trusted' point", () => {
  it("names the served area instead of claiming all of Australia", async () => {
    loadLocationTree.mockResolvedValue(TREE);
    render(await DealsOnline());
    expect(screen.getByText("Trusted in Melbourne")).toBeInTheDocument();
    expect(screen.queryByText(/across australia/i)).not.toBeInTheDocument();
  });

  it("falls back to neutral wording when the API is empty", async () => {
    loadLocationTree.mockResolvedValue([]);
    render(await DealsOnline());
    expect(screen.getByText("Trusted fitting, at your door")).toBeInTheDocument();
  });
});

describe("service JSON-LD", () => {
  const read = (container: HTMLElement) => JSON.parse(container.querySelector("script[type='application/ld+json']")!.textContent!);

  it("lists the served cities as the area served", () => {
    const { container } = render(<ServiceJsonLd name="Tyre sales" description="d" url="/services/tyre-sales" provider="Tiro" areaServed={["Melbourne"]} />);
    expect(read(container).areaServed).toEqual([{ "@type": "City", name: "Melbourne" }]);
  });

  it("omits areaServed rather than claiming Australia when nothing is served", () => {
    const { container } = render(<ServiceJsonLd name="Tyre sales" description="d" url="/services/tyre-sales" provider="Tiro" />);
    expect(read(container)).not.toHaveProperty("areaServed");
  });
});

describe("city photo from the admin's image", () => {
  it("prefers the image the admin attached over the bundled city photo", () => {
    locationImage.mockReturnValue({ src: "/images/locations/location-melbourne.webp", width: 1600, height: 900, alt: "Bundled" });
    render(<CityPhoto citySlug="melbourne" cityName="Melbourne" imageSrc="https://cdn.example.test/melbourne-admin.webp" />);
    const img = screen.getByAltText("Melbourne") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://cdn.example.test/melbourne-admin.webp");
    expect(screen.queryByAltText("Bundled")).not.toBeInTheDocument();
  });

  it("ignores an unusable admin path and uses the bundled photo", () => {
    locationImage.mockReturnValue({ src: "/images/locations/location-melbourne.webp", width: 1600, height: 900, alt: "Bundled" });
    render(<CityPhoto citySlug="melbourne" cityName="Melbourne" imageSrc="locations/relative-only.webp" />);
    expect(screen.getByAltText("Bundled")).toBeInTheDocument();
  });
});
