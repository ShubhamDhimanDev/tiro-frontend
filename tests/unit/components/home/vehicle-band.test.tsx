import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { VehicleBand } from "@/components/home/vehicle-band";

describe("VehicleBand", () => {
  it("has a heading and exactly the four types the catalogue can filter on today, each linking to /tyres by category", () => {
    render(<VehicleBand />);
    expect(screen.getByRole("heading", { level: 2, name: "Mobile tyre fitting for every vehicle" })).toBeInTheDocument();
    const links = within(screen.getByRole("list")).getAllByRole("link");
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Cars", "/tyres?category=car"],
      ["SUVs", "/tyres?category=suv"],
      ["4WD & Utes", "/tyres?category=4x4"],
      ["Light Trucks", "/tyres?category=light_truck"],
    ]);
  });

  it("does not offer types that have no catalogue filter yet", () => {
    render(<VehicleBand />);
    for (const name of [/vans/i, /EV/, /runflat/i, /trailers/i]) {
      expect(screen.queryByRole("link", { name })).not.toBeInTheDocument();
    }
  });

  it("falls back to a plain dark gradient while the road photo file is not registered: no image in the DOM", () => {
    const { container } = render(<VehicleBand />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("section")).toHaveClass("bg-gradient-to-r");
  });
});
