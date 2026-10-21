import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { LocationState } from "@/lib/locations/types";
import { HOURS_LINE, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";

// TopBar is an async server component that reads the served-area tree; tests set what the admin "serves".
const tree = vi.hoisted(() => ({ current: [] as unknown[] }));
vi.mock("@/lib/locations/helpers", () => ({ loadLocationTree: async () => tree.current }));

import { TopBar } from "@/components/layout/top-bar";

const served = (cityNames: string[]): LocationState[] => [
  {
    code: "QX",
    name: "Testland",
    slug: "qx",
    city_count: cityNames.length,
    suburb_count: 0,
    cities: cityNames.map((name, i) => ({ name, slug: name.toLowerCase(), service_zone_id: i + 1, service_zone_ids: [i + 1], suburb_count: 0, suburbs: [] })),
  },
];

async function renderTopBar() {
  return render(await TopBar());
}

afterEach(() => {
  tree.current = [];
});

describe("TopBar", () => {
  it("shows a green WhatsApp link to the call number that opens in a new tab", async () => {
    await renderTopBar();
    const link = screen.getByRole("link", { name: /Book via WhatsApp/ });
    expect(link).toHaveAttribute("href", PHONE_HREF.replace("tel:+", "https://wa.me/"));
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link).toHaveClass("bg-green", "text-white", "h-9");
  });

  it("names the served area from the admin's tree, never a literal place", async () => {
    tree.current = served(["Sampleton"]);
    await renderTopBar();
    expect(screen.getByText("Serving Sampleton")).toBeInTheDocument();
  });

  it("shows no place at all when nothing is served", async () => {
    tree.current = [];
    await renderTopBar();
    expect(screen.queryByText(/Serving/)).not.toBeInTheDocument();
  });

  it("shows the opening hours but no phone number or call link (the header carries the phone)", async () => {
    await renderTopBar();
    expect(screen.getByText(HOURS_LINE)).toBeInTheDocument();
    expect(screen.queryByText(PHONE_DISPLAY)).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="tel:"]')).toBeNull();
  });

  it("hides the place and hours below lg so phones see only the WhatsApp button", async () => {
    tree.current = served(["Sampleton"]);
    await renderTopBar();
    expect(screen.getByText(HOURS_LINE).closest("div")).toHaveClass("hidden", "lg:flex");
  });
});
