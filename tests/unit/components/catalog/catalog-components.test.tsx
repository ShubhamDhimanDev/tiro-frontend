import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { CartProvider } from "@/components/cart/cart-provider";
import { FilterBar } from "@/components/catalog/catalog-filters";
import { TyreModelCard } from "@/components/catalog/tyre-model-card";
import { NoResultsState, InvalidSizeState, InvalidFilterState, BackendErrorState } from "@/components/catalog/results-states";
import { groupTyresByModel } from "@/lib/catalog/group-by-model";
import type { TyreFacets, TyreListItem } from "@/lib/catalog/types";

function item(overrides: Partial<TyreListItem> = {}): TyreListItem {
  return {
    id: 101,
    slug: "bridgestone-turanza-t005-205-55-r16",
    sku: "S",
    width: 205,
    profile: 55,
    rim_diameter: 16,
    load_index: "91",
    speed_rating: "V",
    sidewall: "standard",
    tyre_model: {
      id: 1,
      slug: "turanza",
      name: "Turanza T005",
      brand: { id: 1, name: "Bridgestone", slug: "bridgestone", logo_path: null, country_of_origin: "Japan" },
      category: "car",
      tyre_type: "highway",
      images: [],
    },
    ...overrides,
  };
}

/** `GET /api/catalog/tyres/price-ladders` body for one variant: 4 for 3 from the 4th tyre on. */
function ladderBody(id: number, list: number, fourForThree = false) {
  const unit = (q: number) => (fourForThree && q >= 4 ? Math.round((list * 3) / 4) : list);
  return {
    data: {
      [String(id)]: {
        tyre_variant_id: id,
        list_price: list,
        four_for_three: fourForThree,
        currency: "AUD",
        ladder: [1, 2, 3, 4, 5].map((q) => ({ quantity: q, unit_price: unit(q), total: unit(q) * q, discount_total: 0 })),
      },
    },
  };
}

function stubLadder(body: unknown | null) {
  const fetchMock = vi.fn(async () => (body === null ? new Response("{}", { status: 502 }) : new Response(JSON.stringify(body), { status: 200 })));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  push.mockClear();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("TyreModelCard", () => {
  it("shows brand, pattern, size with load/speed, from price in red, stock, and flips to a quantity table with Add", async () => {
    const user = userEvent.setup();
    const [group] = groupTyresByModel([item({ unit_price: 18900, promotional_price: null, stock_status: "in_stock" })]);
    render(
      <CartProvider>
        <TyreModelCard group={group} tier="premium" />
      </CartProvider>,
    );
    expect(screen.getByRole("link", { name: "Turanza T005" })).toHaveAttribute("href", "/tyres/bridgestone-turanza-t005-205-55-r16");
    // Brand shows on the front and on the back face.
    expect(screen.getAllByText("Bridgestone").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/205\/55 R16 · 91V/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("From")).toBeInTheDocument();
    // First match is the front-face price strip (the back face repeats it in the 4-tyre row).
    expect(screen.getAllByText("$189ea")[0]).toHaveClass("text-green");
    expect(screen.getByText("In stock")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
    // The back face (quantity table + Add) is hidden until the card is flipped.
    expect(screen.queryByRole("button", { name: /Add Bridgestone Turanza T005/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: /Select quantity for Bridgestone Turanza T005/ }));
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("radio", { name: /4 Tyres/ })).toBeChecked();
    expect(screen.getByRole("button", { name: /Add Bridgestone Turanza T005/ })).toBeInTheDocument();
  });

  it("asks for a location when unpriced and cannot be added", () => {
    const [group] = groupTyresByModel([item()]);
    render(
      <CartProvider>
        <TyreModelCard group={group} />
      </CartProvider>,
    );
    expect(screen.getByText("Set your location to see pricing")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Select quantity for/ })).toBeDisabled();
  });

  it("prices the quantity table from the pricing engine and adds the chosen quantity at that price", async () => {
    const user = userEvent.setup();
    // Unique variant id: the ladder hook caches per id for 60 s.
    const fetchMock = stubLadder(ladderBody(2101, 20000));
    const [group] = groupTyresByModel([item({ id: 2101, list_price: 20000 })]);
    render(
      <CartProvider>
        <TyreModelCard group={group} />
      </CartProvider>,
    );
    expect(fetchMock).not.toHaveBeenCalled(); // nothing is fetched until the card flips
    await user.click(screen.getByRole("button", { name: /Select quantity for/ }));
    await waitFor(() => expect(screen.getByTestId("quick-add")).toBeEnabled());
    expect(fetchMock).toHaveBeenCalledWith("/api/catalog/tyres/price-ladders?ids=2101", expect.anything());
    await user.click(screen.getByRole("radio", { name: /2 Tyres/ }));
    expect(screen.getByTestId("card-total")).toHaveTextContent("$400.00");
    await user.click(screen.getByTestId("quick-add"));
    expect(screen.getByRole("status")).toHaveTextContent(/added to cart \(2 tyres\)/);
    const stored = JSON.parse(localStorage.getItem("mts_cart")!).items[0];
    expect(stored).toMatchObject({ tyre_variant_id: 2101, quantity: 2, position: "all", unit_cents: 20000 });
  });

  it("shows the API four_for_three sticker, with the engine's 4-tyre price struck against the list price", async () => {
    stubLadder(ladderBody(2102, 20000, true));
    const [group] = groupTyresByModel([item({ id: 2102, list_price: 20000, four_for_three: true })]);
    const { container } = render(
      <CartProvider>
        <TyreModelCard group={group} />
      </CartProvider>,
    );
    expect(screen.getByTestId("four-for-three")).toBeInTheDocument();
    // On mount (no flip): the strip shows the list price struck and the 4-tyre price from the ladder.
    await waitFor(() => expect(container.querySelector("s")).toHaveTextContent("$200ea"));
    expect(screen.getAllByText("$150ea").length).toBeGreaterThanOrEqual(1);
  });

  it("shows no 4 for 3 sticker when the API does not flag the tyre", () => {
    stubLadder(null);
    const [group] = groupTyresByModel([item({ id: 2108, list_price: 20000, four_for_three: false })]);
    render(
      <CartProvider>
        <TyreModelCard group={group} />
      </CartProvider>,
    );
    expect(screen.queryByTestId("four-for-three")).toBeNull();
  });

  it("shows the list price without a location, and falls back to flat quantity prices when the engine fails", async () => {
    const user = userEvent.setup();
    stubLadder(null);
    const [group] = groupTyresByModel([item({ id: 2103, list_price: 18900 })]);
    render(
      <CartProvider>
        <TyreModelCard group={group} />
      </CartProvider>,
    );
    expect(screen.getAllByText("$189ea")[0]).toHaveClass("text-green");
    await user.click(screen.getByRole("button", { name: /Select quantity for/ }));
    await waitFor(() => expect(screen.getByText(/Quantity prices could not be loaded/)).toBeInTheDocument());
    expect(screen.getByRole("radio", { name: /1 Tyre/ })).toBeInTheDocument();
    expect(screen.getByTestId("quick-add")).toBeEnabled();
  });

  it("defaults to 2 tyres for an axle pair", async () => {
    const user = userEvent.setup();
    stubLadder(ladderBody(2104, 20000));
    const [group] = groupTyresByModel([item({ id: 2104, list_price: 20000 })]);
    render(
      <CartProvider>
        <TyreModelCard group={group} position="front" />
      </CartProvider>,
    );
    await user.click(screen.getByRole("button", { name: /Select quantity for/ }));
    expect(screen.getByRole("radio", { name: /2 Tyres/ })).toBeChecked();
  });

  it("lists real feature chips including Run-flat", () => {
    stubLadder(null);
    const [group] = groupTyresByModel([item({ id: 2105, list_price: 20000, run_flat: true })]);
    render(
      <CartProvider>
        <TyreModelCard group={group} />
      </CartProvider>,
    );
    const chips = within(screen.getByRole("list", { name: "Tyre features" })).getAllByRole("listitem").map((li) => li.textContent);
    expect(chips).toEqual(["Passenger Car", "Highway", "Run-flat"]);
  });

  it("shows a special-price badge and the was-price when discounted", () => {
    const [group] = groupTyresByModel([item({ unit_price: 21500, promotional_price: 19900 })]);
    render(
      <CartProvider>
        <TyreModelCard group={group} />
      </CartProvider>,
    );
    expect(screen.getByText("Special price")).toBeInTheDocument();
    expect(screen.getByText("$215.00")).toBeInTheDocument();
  });

  it("asks which size on the back face when a model has several, and adds the chosen one", async () => {
    const user = userEvent.setup();
    stubLadder(null);
    const [group] = groupTyresByModel([
      item({ id: 2201, slug: "x-1", list_price: 18000 }),
      item({ id: 2202, slug: "x-2", width: 225, profile: 45, rim_diameter: 17, list_price: 24000 }),
    ]);
    render(
      <CartProvider>
        <TyreModelCard group={group} />
      </CartProvider>,
    );
    expect(screen.getByText(/\+1 more size/)).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull(); // hidden face is not exposed until flipped
    await user.click(screen.getByRole("button", { name: /Select quantity for/ }));
    const picker = screen.getByRole("combobox", { name: /Size for/ });
    expect(picker).toHaveValue("205/55 R16");
    await user.selectOptions(picker, "225/45 R17");
    await user.click(screen.getByTestId("quick-add"));
    const stored = JSON.parse(localStorage.getItem("mts_cart")!).items[0];
    expect(stored).toMatchObject({ tyre_variant_id: 2202, unit_cents: 24000 });
  });
});

describe("FilterBar (phone sheet)", () => {
  it("shows the applied count, opens a dialog, and applies a draft to the URL keeping the size", async () => {
    const user = userEvent.setup();
    render(
      <FilterBar
        values={{ width: "205", profile: "55", rim_diameter: "16", brand: "michelin" }}
        brands={[
          { slug: "michelin", name: "Michelin" },
          { slug: "kumho", name: "Kumho" },
        ]}
      />,
    );
    const opener = screen.getByRole("button", { name: "Filters (1)" });
    await user.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Filters" });
    await user.click(within(dialog).getByRole("button", { name: "Tyre type" }));
    await user.click(within(dialog).getByRole("checkbox", { name: "Performance" }));
    await user.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
    const params = new URL(push.mock.calls[0][0] as string, "http://x").searchParams;
    expect(params.get("width")).toBe("205");
    expect(params.get("brand")).toBe("michelin");
    expect(params.get("tyre_type")).toBe("performance");
  });

  it("Clear empties the draft so Apply removes filters", async () => {
    const user = userEvent.setup();
    render(<FilterBar values={{ width: "205", profile: "55", rim_diameter: "16", brand: "michelin" }} brands={[]} />);
    await user.click(screen.getByRole("button", { name: "Filters (1)" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Clear filters" }));
    await user.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(new URL(push.mock.calls[0][0] as string, "http://x").searchParams.get("brand")).toBeNull();
  });

  it("changing sort keeps filters", async () => {
    const user = userEvent.setup();
    render(<FilterBar values={{ width: "205", profile: "55", rim_diameter: "16", brand: "kumho" }} brands={[]} />);
    await user.selectOptions(screen.getByLabelText("Sort"), "price_asc");
    const params = new URL(push.mock.calls[0][0] as string, "http://x").searchParams;
    expect(params.get("sort")).toBe("price_asc");
    expect(params.get("brand")).toBe("kumho");
  });
});

const FACETS: TyreFacets = {
  total: 6,
  brands: [
    { slug: "michelin", name: "Michelin", tier: "premium", count: 3 },
    { slug: "kumho", name: "Kumho", tier: "mid", count: 2 },
  ],
  patterns: [
    { slug: "michelin-primacy-4", name: "Primacy 4", brand_slug: "michelin", brand_name: "Michelin", tier: "premium", count: 2 },
    { slug: "kumho-ecsta", name: "Ecsta", brand_slug: "kumho", brand_name: "Kumho", tier: "mid", count: 1 },
  ],
  tyre_types: [{ value: "highway", count: 5 }],
  categories: [{ value: "car", count: 6 }],
  tiers: [],
  run_flat: { yes: 1, no: 5 },
  price: { min: 11900, max: 38900 },
  load_index: { min: 82, max: 107 },
  speed_ratings: ["H", "V", "W"],
  car_makes: [{ make: "Toyota", count: 2 }],
};

describe("FilterBar with API facets (multi-select, API-driven options)", () => {
  it("builds option lists from facets, multi-selects brands as CSV and sends the extra filters to the URL", async () => {
    const user = userEvent.setup();
    render(<FilterBar values={{ width: "205", profile: "55", rim_diameter: "16" }} brands={[]} facets={FACETS} />);
    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    const dialog = screen.getByRole("dialog");
    // Speed ratings come from the facets, not the fixed list.
    const speed = within(dialog).getByLabelText("Min. speed rating");
    expect(within(speed).getAllByRole("option").map((o) => o.textContent)).toEqual(["All", "H", "V", "W"]);
    expect(within(dialog).getByRole("option", { name: "Yes (1)" })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /Brands/ }));
    await user.click(within(dialog).getByRole("checkbox", { name: /Michelin/ }));
    await user.click(within(dialog).getByRole("checkbox", { name: /Kumho/ }));
    await user.selectOptions(within(dialog).getByLabelText("Min. load index"), "90");
    await user.selectOptions(within(dialog).getByLabelText("Min. speed rating"), "V");
    await user.selectOptions(within(dialog).getByLabelText("Runflat"), "no");
    await user.click(within(dialog).getByRole("button", { name: /Price range/ }));
    await user.selectOptions(within(dialog).getByLabelText("Min ($)"), "150");
    await user.click(within(dialog).getByRole("button", { name: /Car make/ }));
    await user.click(within(dialog).getByRole("checkbox", { name: /Toyota/ }));
    await user.click(within(dialog).getByRole("button", { name: /Pattern/ }));
    await user.click(within(dialog).getByRole("checkbox", { name: /Primacy 4/ }));
    await user.click(within(dialog).getByRole("button", { name: /Apply|Show/ }));
    const params = new URL(push.mock.calls[0][0] as string, "http://x").searchParams;
    expect(params.get("brand")).toBe("michelin,kumho");
    expect(params.get("min_load")).toBe("90");
    expect(params.get("min_speed")).toBe("V");
    expect(params.get("runflat")).toBe("no");
    expect(params.get("price_min")).toBe("150");
    expect(params.get("car_make")).toBe("toyota");
    expect(params.get("pattern")).toBe("michelin-primacy-4");
    expect(params.get("width")).toBe("205");
  });

  it("narrows patterns to the chosen brands", async () => {
    const user = userEvent.setup();
    render(<FilterBar values={{ width: "205", profile: "55", rim_diameter: "16", brand: "kumho" }} brands={[]} facets={FACETS} />);
    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Pattern/ }));
    expect(within(dialog).queryByRole("checkbox", { name: /Primacy 4/ })).toBeNull();
    expect(within(dialog).getByRole("checkbox", { name: /Ecsta/ })).toBeInTheDocument();
  });

  it("without facets falls back to the brands list and hides the car make group", async () => {
    const user = userEvent.setup();
    render(<FilterBar values={{ width: "205", profile: "55", rim_diameter: "16" }} brands={[{ slug: "kumho", name: "Kumho" }]} />);
    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Brands/ }));
    expect(within(dialog).getByRole("checkbox", { name: "Kumho" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /Car make/ })).toBeNull();
  });
});

describe("empty and error states", () => {
  it("filtered no results offers Clear filters", () => {
    render(<NoResultsState values={{ width: "205" }} clearHref="/tyres?width=205" />);
    expect(screen.getByText("No tyres match these filters.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/tyres?width=205");
  });
  it("invalid filter explains and offers Clear filters", () => {
    render(<InvalidFilterState message="The min load must be at most 130." clearHref="/tyres?width=205" />);
    expect(screen.getByRole("alert")).toHaveTextContent("at most 130");
    expect(screen.getByRole("link", { name: "Clear filters" })).toBeInTheDocument();
  });
  it("no results: one clear message, change size and request a quote", () => {
    render(<NoResultsState values={{ width: "205", profile: "55", rim_diameter: "16" }} />);
    expect(screen.getByText(/no products available for this fitment/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try a different size" })).toBeInTheDocument();
    // The quote form opens on its own tab with the searched size prefilled.
    expect(screen.getByRole("link", { name: "Request a quote" })).toHaveAttribute("href", "/contact?type=quote&size=205%2F55R16");
  });
  it("invalid size explains and offers change size", () => {
    render(<InvalidSizeState message="width must be a positive integer." values={{}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("width must be a positive integer.");
    expect(screen.getByRole("button", { name: "Change size" })).toBeInTheDocument();
  });
  it("backend error offers one retry link", () => {
    render(<BackendErrorState retryHref="/tyres?width=205" />);
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/tyres?width=205");
  });
});
