import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/tyres",
  useSearchParams: () => new URLSearchParams(),
}));
const fetchCount = vi.fn();
vi.mock("@/lib/catalog/count-client", () => ({ fetchTyreCount: (...a: unknown[]) => fetchCount(...a) }));

import { FilterBar } from "@/components/catalog/catalog-filters";
import { BrandHero } from "@/components/catalog/brand-hero";
import { NoResultsState, SideEmptyState } from "@/components/catalog/results-states";
import { apiTierOf, deriveTiers } from "@/lib/catalog/tiers";
import { formatQuoteSize, quoteHref, quoteHrefForValues } from "@/lib/catalog/quote";
import { isBrowseRequest } from "@/lib/catalog/search-params";
import { isUpdatedAfterPublish } from "@/lib/content/prose";
import type { TyreModelGroup } from "@/lib/catalog/group-by-model";
import type { ApiTier } from "@/lib/catalog/types";

function group(slug: string, opts: { tier?: ApiTier | null; brandTier?: ApiTier | null; price?: number } = {}): TyreModelGroup {
  return {
    model: {
      id: 1,
      slug,
      name: slug,
      brand: { id: 1, name: "B", slug: "b", logo_path: null, country_of_origin: null, tier: opts.brandTier },
      category: "car",
      tyre_type: "highway",
      images: [],
      tier: opts.tier,
    },
    variants: [],
    fromPrice: opts.price,
  };
}

describe("tiers from the API", () => {
  it("uses the API tier for badges and picks when all three tiers are present, ignoring price", () => {
    const result = deriveTiers([
      group("cheap-premium", { tier: "premium", price: 10000 }),
      group("dear-budget", { tier: "budget", price: 90000 }),
      group("mid", { tier: "mid", price: 50000 }),
      group("other-premium", { tier: "premium", price: 12000 }),
    ])!;
    expect(result.picks.map((p) => [p.tier, p.group.model.slug])).toEqual([
      ["premium", "cheap-premium"],
      ["mid", "mid"],
      ["budget", "dear-budget"],
    ]);
    expect(result.byModel).toEqual({ "cheap-premium": "premium", "dear-budget": "budget", mid: "mid", "other-premium": "premium" });
  });

  it("badges classified models without picks when a tier is missing, and works without any prices", () => {
    const result = deriveTiers([group("a", { tier: "premium" }), group("b", { brandTier: "mid" }), group("c")])!;
    expect(result.picks).toEqual([]);
    expect(result.byModel).toEqual({ a: "premium", b: "mid" });
  });

  it("falls back to the price-based derivation when the API classified nothing", () => {
    const result = deriveTiers([group("a", { price: 20000 }), group("b", { price: 32000 }), group("c", { price: 29000 })])!;
    expect(result.picks.map((p) => p.tier)).toEqual(["premium", "mid", "budget"]);
    expect(result.picks[0].group.model.slug).toBe("b");
  });

  it("returns null when there is nothing to go on", () => {
    expect(deriveTiers([group("a"), group("b")])).toBeNull();
  });

  it("reads model tier first, then the brand's", () => {
    expect(apiTierOf(group("a", { tier: "mid", brandTier: "premium" }))).toBe("mid");
    expect(apiTierOf(group("a", { brandTier: "premium" }))).toBe("premium");
    expect(apiTierOf(group("a"))).toBeNull();
  });
});

describe("FilterBar Show N tyres", () => {
  beforeEach(() => {
    push.mockClear();
    fetchCount.mockReset();
  });

  it("asks for the count of the draft and labels Apply with it", async () => {
    fetchCount.mockResolvedValue(24);
    const user = userEvent.setup();
    render(<FilterBar values={{ width: "205", profile: "55", rim_diameter: "16" }} brands={[{ slug: "michelin", name: "Michelin" }]} />);
    await user.click(screen.getByRole("button", { name: "Filters (0)" }));
    const dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(await within(dialog).findByRole("button", { name: "Show 24 tyres" })).toBeEnabled();
    expect(fetchCount.mock.calls[0][0]).toContain("width=205");

    fetchCount.mockResolvedValue(3);
    await user.click(within(dialog).getByRole("button", { name: "Tyre type" }));
    await user.click(within(dialog).getByRole("checkbox", { name: "Performance" }));
    expect(await within(dialog).findByRole("button", { name: "Show 3 tyres" })).toBeInTheDocument();
    expect(fetchCount.mock.calls.at(-1)![0]).toContain("tyre_type=performance");
  });

  it("uses the singular for one tyre, and disables Apply when nothing matches", async () => {
    fetchCount.mockResolvedValue(1);
    const user = userEvent.setup();
    render(<FilterBar values={{ width: "205", profile: "55", rim_diameter: "16" }} brands={[]} />);
    await user.click(screen.getByRole("button", { name: "Filters (0)" }));
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByRole("button", { name: "Show 1 tyre" })).toBeInTheDocument();

    fetchCount.mockResolvedValue(0);
    await user.click(within(dialog).getByRole("button", { name: "Vehicle" }));
    await user.click(within(dialog).getByRole("checkbox", { name: "SUV" }));
    const none = await within(dialog).findByRole("button", { name: "No tyres match" });
    expect(none).toBeDisabled();
    expect(within(dialog).getByText("No tyres match these filters.")).toBeInTheDocument();
  });

  it("falls back to a plain Apply when the count is unavailable", async () => {
    fetchCount.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<FilterBar values={{ width: "205", profile: "55", rim_diameter: "16" }} brands={[]} />);
    await user.click(screen.getByRole("button", { name: "Filters (0)" }));
    await waitFor(() => expect(fetchCount).toHaveBeenCalled());
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Apply" })).toBeEnabled();
  });
});

describe("request a quote from empty states", () => {
  it("builds the quote link with a validated size only", () => {
    expect(formatQuoteSize("205", "55", "16")).toBe("205/55R16");
    expect(formatQuoteSize("205", "55", undefined)).toBeNull();
    expect(formatQuoteSize("<b>", "55", "16")).toBeNull();
    expect(quoteHref("205/55R16")).toBe("/contact?type=quote&size=205%2F55R16");
    expect(quoteHref()).toBe("/contact?type=quote");
    expect(quoteHrefForValues({ staggered: "true", front_width: "225", front_profile: "45", front_rim_diameter: "17" }, "front")).toBe(
      "/contact?type=quote&size=225%2F45R17",
    );
  });

  it("NoResultsState and SideEmptyState link to the quote tab with the size", () => {
    const { unmount } = render(<NoResultsState values={{ width: "245", profile: "45", rim_diameter: "18" }} />);
    expect(screen.getByRole("link", { name: "Request a quote" })).toHaveAttribute("href", "/contact?type=quote&size=245%2F45R18");
    unmount();
    render(<SideEmptyState message="No rear tyres." size="245/40R19" />);
    expect(screen.getByRole("link", { name: "Request a quote" })).toHaveAttribute("href", "/contact?type=quote&size=245%2F40R19");
  });
});

describe("filter-only browse (offers 'Shop this offer')", () => {
  it("treats brand/category/type without a size as a browse, not the hub", () => {
    expect(isBrowseRequest({ brand: "bridgestone" })).toBe(true);
    expect(isBrowseRequest({ category: "suv", brand: "michelin" })).toBe(true);
    expect(isBrowseRequest({})).toBe(false);
    expect(isBrowseRequest({ width: "205", brand: "michelin" })).toBe(false);
  });
});

describe("brand hero", () => {
  it("shows the API tier and pattern count", () => {
    render(<BrandHero title="Michelin tyres" tier="premium" modelCount={3} brandSlug="michelin" />);
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("3 patterns in our range")).toBeInTheDocument();
  });
  it("shows neither when the API has no tier and no count", () => {
    render(<BrandHero title="Kumho tyres" tier={null} brandSlug="kumho" />);
    expect(screen.queryByText("Premium")).not.toBeInTheDocument();
    expect(screen.queryByText(/patterns in our range/)).not.toBeInTheDocument();
  });
});

describe("Updated date", () => {
  it("only flags an edit made on a later day than publication", () => {
    expect(isUpdatedAfterPublish("2026-08-01T00:00:00+00:00", "2026-08-15T10:30:00+00:00")).toBe(true);
    expect(isUpdatedAfterPublish("2026-08-01T01:00:00+00:00", "2026-08-01T20:00:00+00:00")).toBe(false);
    expect(isUpdatedAfterPublish(null, "2026-08-15T10:30:00+00:00")).toBe(false);
    expect(isUpdatedAfterPublish("2026-08-01T00:00:00+00:00", undefined)).toBe(false);
  });
});
