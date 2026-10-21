import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { LocationState } from "@/lib/locations/types";

// TopBar is an async server component that reads the served-area tree; tests set what the admin "serves".
const tree = vi.hoisted(() => ({ current: [] as unknown[] }));
vi.mock("@/lib/locations/helpers", () => ({ loadLocationTree: async () => tree.current }));

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

/** `config.ts` reads the env once at import, so load a fresh TopBar for each WhatsApp setting. */
async function renderTopBar(whatsapp: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", whatsapp);
  const { TopBar } = await import("@/components/layout/top-bar");
  return render(await TopBar());
}

afterEach(() => {
  vi.unstubAllEnvs();
  tree.current = [];
});

describe("TopBar", () => {
  it("hides the WhatsApp button, and the whole strip below lg, when no number is configured", async () => {
    await renderTopBar("");
    expect(screen.queryByRole("link", { name: /whatsapp/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("top-bar")).toHaveClass("max-lg:hidden");
  });

  it("shows a green WhatsApp link to wa.me that opens in a new tab, and stays visible on phones", async () => {
    await renderTopBar("0412 345 678");
    const link = screen.getByRole("link", { name: /Book via WhatsApp/ });
    expect(link).toHaveAttribute("href", "https://wa.me/61412345678");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link).toHaveClass("bg-whatsapp");
    expect(screen.getByTestId("top-bar")).not.toHaveClass("max-lg:hidden");
  });

  it("names the served area from the admin's tree, never a literal place", async () => {
    tree.current = served(["Sampleton"]);
    await renderTopBar("");
    expect(screen.getByText("Serving Sampleton")).toBeInTheDocument();
  });

  it("shows no place at all when nothing is served", async () => {
    tree.current = [];
    await renderTopBar("");
    expect(screen.queryByText(/Serving/)).not.toBeInTheDocument();
  });

  it("shows the opening hours and a tel: phone link from the site config", async () => {
    const { HOURS_LINE, PHONE_DISPLAY, PHONE_HREF } = await import("@/lib/site/config");
    await renderTopBar("");
    expect(screen.getByText(HOURS_LINE)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: PHONE_DISPLAY })).toHaveAttribute("href", PHONE_HREF);
  });
});
