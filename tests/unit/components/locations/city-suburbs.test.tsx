import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const setZone = vi.fn();
vi.mock("@/components/location/location-provider", () => ({ useLocation: () => ({ setZone }) }));
const check = vi.fn();
vi.mock("@/lib/location/client-api", () => ({ locationApi: { check: (...a: unknown[]) => check(...a) } }));
vi.mock("@/lib/enquiries/client-api", () => ({ submitEnquiry: vi.fn(), THROTTLE_MESSAGE: "x" }));
// City photos are wired in `lib/site/images.ts`, so the test controls whether one exists.
const locationImage = vi.hoisted(() => vi.fn());
vi.mock("@/lib/site/images", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/site/images")>()), locationImage }));

import { CitySuburbs } from "@/components/locations/city-suburbs";
import { CityAreaButton } from "@/components/locations/city-area-button";
import { CityPhoto } from "@/components/locations/city-photo";

const suburbs = [
  { name: "Melbourne", slug: "melbourne", postcode: "3000", service_zone_id: 3 },
  { name: "Richmond", slug: "richmond", postcode: "3121", service_zone_id: 3 },
  { name: "St Kilda", slug: "st-kilda", postcode: "3182", service_zone_id: 1 },
];

describe("CitySuburbs", () => {
  beforeEach(() => {
    setZone.mockClear();
    check.mockReset();
  });

  it("lists suburbs with postcodes and filters as you type, without any request", async () => {
    const user = userEvent.setup();
    render(<CitySuburbs cityName="Melbourne" suburbs={suburbs} />);
    expect(screen.getByRole("list", { name: "Suburbs in Melbourne" }).querySelectorAll("li")).toHaveLength(3);
    await user.type(screen.getByLabelText("Search suburbs in Melbourne"), "kilda");
    expect(screen.getByRole("list", { name: "Suburbs in Melbourne" }).querySelectorAll("li")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("1 suburb match");
    expect(check).not.toHaveBeenCalled();
  });

  it("choosing a suburb sets the area from its postcode", async () => {
    check.mockResolvedValue({ kind: "success", status: 200, data: { serviceable: true, service_zone_id: 3, label: "Melbourne Metro", suggested_areas: [] } });
    const user = userEvent.setup();
    render(<CitySuburbs cityName="Melbourne" suburbs={suburbs} />);
    await user.click(screen.getByRole("button", { name: /Richmond/ }));
    expect(check).toHaveBeenCalledWith({ postcode: "3121" });
    expect(setZone).toHaveBeenCalledWith({ zoneId: "3", label: "Melbourne Metro" });
    expect(await screen.findByText(/we fit tyres in Melbourne Metro/)).toBeInTheDocument();
  });

  it("with no match offers a direct check, and a suburb we don't serve gets the notify-me capture", async () => {
    check.mockResolvedValue({ kind: "success", status: 200, data: { serviceable: false, service_zone_id: null, label: null, suggested_areas: [] } });
    const user = userEvent.setup();
    render(<CitySuburbs cityName="Melbourne" suburbs={suburbs} />);
    await user.type(screen.getByLabelText("Search suburbs in Melbourne"), "Ballarat");
    expect(screen.getByRole("status")).toHaveTextContent('No suburb in our Melbourne list matches "Ballarat"');
    await user.click(screen.getByRole("button", { name: /Check .Ballarat./ }));
    expect(check).toHaveBeenCalledWith({ suburb: "Ballarat" });
    expect(await screen.findByText(/We don't fit tyres in Ballarat yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tell me when you reach my area" })).toBeInTheDocument();
    expect(setZone).not.toHaveBeenCalled();
  });

  it("collapses a long list behind Show all", async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ name: `Suburb ${i}`, slug: `s-${i}`, postcode: String(3000 + i), service_zone_id: 1 }));
    const user = userEvent.setup();
    render(<CitySuburbs cityName="Melbourne" suburbs={many} />);
    expect(screen.getByRole("list", { name: "Suburbs in Melbourne" }).querySelectorAll("li")).toHaveLength(24);
    await user.click(screen.getByRole("button", { name: "Show all 30 suburbs" }));
    expect(screen.getByRole("list", { name: "Suburbs in Melbourne" }).querySelectorAll("li")).toHaveLength(30);
  });
});

describe("CityAreaButton", () => {
  beforeEach(() => {
    setZone.mockClear();
    check.mockReset();
  });
  it("sets the area to the city via its postcode", async () => {
    check.mockResolvedValue({ kind: "success", status: 200, data: { serviceable: true, service_zone_id: 3, label: "Melbourne Metro", suggested_areas: [] } });
    const user = userEvent.setup();
    render(<CityAreaButton cityName="Melbourne" postcode="3000" />);
    await user.click(screen.getByRole("button", { name: /Use Melbourne for prices and times/ }));
    expect(check).toHaveBeenCalledWith({ postcode: "3000" });
    expect(setZone).toHaveBeenCalledWith({ zoneId: "3", label: "Melbourne Metro" });
  });
  it("renders nothing without a postcode", () => {
    const { container } = render(<CityAreaButton cityName="X" postcode={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("CityPhoto", () => {
  it("draws the photo when one exists", () => {
    locationImage.mockReturnValue({ src: "/images/locations/location-melbourne.webp", width: 1600, height: 900, alt: "A Tiro van in Melbourne" });
    render(<CityPhoto citySlug="melbourne" cityName="Melbourne" />);
    expect(screen.getByAltText("A Tiro van in Melbourne")).toBeInTheDocument();
  });

  it("draws the CSS fallback with the city name until a photo exists", () => {
    locationImage.mockReturnValue(null);
    render(<CityPhoto citySlug="melbourne" cityName="Melbourne" />);
    const slot = screen.getByTestId("city-photo");
    expect(slot).toHaveClass("asphalt-texture");
    expect(slot).toHaveTextContent("Melbourne");
    expect(slot.querySelector("img")).toBeNull();
  });
});
