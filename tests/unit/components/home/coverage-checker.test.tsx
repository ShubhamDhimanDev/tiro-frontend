import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const setZone = vi.fn();
vi.mock("@/components/location/location-provider", () => ({ useLocation: () => ({ setZone }) }));
const check = vi.fn();
vi.mock("@/lib/location/client-api", () => ({ locationApi: { check: (...a: unknown[]) => check(...a) } }));

import { CoverageChecker } from "@/components/home/coverage-checker";

describe("CoverageChecker", () => {
  beforeEach(() => {
    setZone.mockClear();
    check.mockReset();
  });

  it("links each city chip to its city page", () => {
    render(
      <CoverageChecker
        cities={[
          { name: "Melbourne", href: "/locations/vic/melbourne" },
          { name: "Sydney", href: "/locations/nsw/sydney" },
        ]}
      />,
    );
    const links = screen.getByRole("list", { name: "Cities we cover" }).querySelectorAll("a");
    expect(Array.from(links).map((a) => a.getAttribute("href"))).toEqual(["/locations/vic/melbourne", "/locations/nsw/sydney"]);
  });

  it("hides the city chips when the API has no cities", () => {
    render(<CoverageChecker cities={[]} />);
    expect(screen.queryByRole("list", { name: "Cities we cover" })).not.toBeInTheDocument();
  });

  it("asks for input before calling the API", async () => {
    const user = userEvent.setup();
    render(<CoverageChecker />);
    await user.click(screen.getByRole("button", { name: "Check my area" }));
    expect(screen.getByText("Enter a suburb or a 4-digit postcode.")).toBeInTheDocument();
    expect(check).not.toHaveBeenCalled();
  });

  it("sends a postcode as a postcode, sets the zone and confirms coverage", async () => {
    check.mockResolvedValue({
      kind: "success",
      status: 200,
      data: { serviceable: true, service_zone_id: 3, label: "Melbourne Metro", suggested_areas: [] },
    });
    const user = userEvent.setup();
    render(<CoverageChecker />);
    await user.type(screen.getByLabelText("Your suburb"), "3182");
    await user.click(screen.getByRole("button", { name: "Check my area" }));
    expect(check).toHaveBeenCalledWith({ postcode: "3182" });
    expect(setZone).toHaveBeenCalledWith({ zoneId: "3", label: "Melbourne Metro" });
    expect(await screen.findByText(/we fit tyres in Melbourne Metro/)).toBeInTheDocument();
  });

  it("explains an uncovered suburb, offers contact and nearby areas, and sets no zone", async () => {
    check.mockResolvedValue({
      kind: "success",
      status: 200,
      data: { serviceable: false, service_zone_id: null, label: null, suggested_areas: ["Geelong"] },
    });
    const user = userEvent.setup();
    render(<CoverageChecker />);
    await user.type(screen.getByLabelText("Your suburb"), "Ballarat");
    await user.click(screen.getByRole("button", { name: "Check my area" }));
    expect(await screen.findByText(/cover .Ballarat. yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "/contact");
    // not a dead end: the notify-me capture is offered
    expect(screen.getByRole("button", { name: "Tell me when you reach my area" })).toBeInTheDocument();
    expect(setZone).not.toHaveBeenCalled();
    check.mockResolvedValue({
      kind: "success",
      status: 200,
      data: { serviceable: true, service_zone_id: 9, label: "Geelong", suggested_areas: [] },
    });
    await user.click(screen.getByRole("button", { name: "Geelong" }));
    expect(check).toHaveBeenLastCalledWith({ suburb: "Geelong" });
  });

  it("shows the API error message", async () => {
    check.mockResolvedValue({ kind: "unknown_error", status: 0, message: "Could not reach the server." });
    const user = userEvent.setup();
    render(<CoverageChecker />);
    await user.type(screen.getByLabelText("Your suburb"), "Richmond");
    await user.click(screen.getByRole("button", { name: "Check my area" }));
    expect(await screen.findByText("Could not reach the server.")).toBeInTheDocument();
  });
});
