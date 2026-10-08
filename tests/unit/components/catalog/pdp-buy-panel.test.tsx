import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PdpBuyPanel, PdpStickyBar } from "@/components/catalog/pdp-buy-panel";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/checkout/fitting-date-strip", () => ({
  FittingDateStrip: () => null,
  FittingLocationStrip: () => null,
  useFittingSelection: () => [null, vi.fn()],
}));
vi.mock("@/components/location/location-capture-form", () => ({ LocationCaptureForm: () => null }));
const openPicker = vi.fn();
vi.mock("@/components/location/location-provider", () => ({ useLocation: () => ({ openPicker }) }));
vi.mock("@/components/catalog/bnpl-lines", () => ({ BnplLines: () => null }));
vi.mock("@/components/catalog/pdp-next-slot", () => ({ PdpNextSlot: () => null }));
vi.mock("@/components/catalog/stock-badge", () => ({ StockBadge: () => null }));

const buy = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/components/catalog/pdp-buy-context", () => ({ usePdpBuy: () => buy.value }));

function setContext(availability: unknown, extra: Record<string, unknown> = {}) {
  buy.value = {
    availability,
    tyreVariantId: 1,
    position: "all",
    quantity: 4,
    setQuantity: vi.fn(),
    totalCents: null,
    justAdded: false,
    add: vi.fn(),
    addButtonInView: false,
    setAddButtonInView: vi.fn(),
    ...extra,
  };
}

beforeEach(() => {
  push.mockReset();
  openPicker.mockReset();
  vi.stubGlobal("IntersectionObserver", undefined);
});

describe("PDP Add to cart without a location", () => {
  it("disables Add to cart and tells the customer to enter a suburb when no zone is set", () => {
    setContext({ status: "no-zone" });
    render(<PdpBuyPanel />);
    expect(screen.getByTestId("pdp-add")).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(/enter your suburb/i);
  });

  it("also disables Add to cart while the saved zone is still loading", () => {
    setContext({ status: "zone-loading" });
    render(<PdpBuyPanel />);
    expect(screen.getByTestId("pdp-add")).toBeDisabled();
  });

  it("swaps the sticky bar's Add button for a Set location button that opens the picker", async () => {
    setContext({ status: "no-zone" });
    render(<PdpStickyBar />);
    expect(screen.queryByRole("button", { name: /add to cart/i })).not.toBeInTheDocument();
    const setLocation = screen.getByRole("button", { name: /set location/i });
    expect(setLocation).toBeEnabled();
    await userEvent.click(setLocation);
    expect(openPicker).toHaveBeenCalledTimes(1);
  });

  it("keeps the sticky bar's Add button disabled while the saved zone is loading", () => {
    setContext({ status: "zone-loading" });
    render(<PdpStickyBar />);
    expect(screen.getByRole("button", { name: /add to cart/i })).toBeDisabled();
  });

  it("hides the fitting-time section and Express Checkout until there is a location", () => {
    setContext({ status: "no-zone" });
    const { unmount } = render(<PdpBuyPanel />);
    expect(screen.queryByTestId("pdp-express")).not.toBeInTheDocument();
    unmount();
    setContext({ status: "zone-loading" });
    const loading = render(<PdpBuyPanel />);
    expect(screen.queryByTestId("pdp-express")).not.toBeInTheDocument();
    loading.unmount();
    setContext({ status: "ready", data: { currency: "AUD", stock_status: "in_stock" } }, { totalCents: 75600 });
    render(<PdpBuyPanel />);
    expect(screen.getByTestId("pdp-express")).toBeDisabled();
  });

  it("enables Add to cart once the price is ready", () => {
    setContext(
      { status: "ready", data: { currency: "AUD", stock_status: "in_stock" } },
      { totalCents: 75600 },
    );
    render(<PdpBuyPanel />);
    expect(screen.getByTestId("pdp-add")).toBeEnabled();
    expect(screen.queryByText(/enter your suburb/i)).not.toBeInTheDocument();
  });
});
