import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SavedAddressesList } from "@/components/account/saved-addresses-list";
import { SavedVehiclesList } from "@/components/account/saved-vehicles-list";
import { OrderHistoryList } from "@/components/account/order-history-list";
import { customerAddressesApi } from "@/lib/customer-addresses/client-api";
import { customerVehiclesApi } from "@/lib/customer-vehicles/client-api";
import { customerOrdersApi } from "@/lib/customer-orders/client-api";

const mockUseAuth = vi.fn();
vi.mock("@/components/auth/auth-provider", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("@/lib/customer-addresses/client-api", () => ({
  customerAddressesApi: { list: vi.fn(), remove: vi.fn(), setDefault: vi.fn() },
}));
vi.mock("@/lib/customer-vehicles/client-api", () => ({
  customerVehiclesApi: { list: vi.fn(), remove: vi.fn(), setDefault: vi.fn() },
}));
vi.mock("@/lib/customer-orders/client-api", () => ({ customerOrdersApi: { list: vi.fn() } }));

const customer = { id: 1, name: "Jess", email: "jess@example.com", mobile: null };
const ok = <T,>(data: T) => ({ kind: "success" as const, status: 200 as const, data });

function address(overrides = {}) {
  return {
    id: 7,
    label: "Home",
    line1: "12 Example St",
    line2: null,
    postcode: "3121",
    suburb: { id: 1, name: "Richmond", state: "VIC" },
    lat: 0,
    lng: 0,
    access_instructions: null,
    is_default: false,
    created_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ customer, loading: false });
});

describe("account empty states (one action each)", () => {
  it("orders: message plus a single link to find tyres", async () => {
    vi.mocked(customerOrdersApi.list).mockResolvedValue(ok({ data: [], meta: { current_page: 1, per_page: 20, total: 0, last_page: 1 }, links: { next: null, prev: null } }));
    render(<OrderHistoryList />);
    expect(await screen.findByText("You haven't placed any orders yet.")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Find your tyres" })).toHaveAttribute("href", "/tyres");
  });

  it("vehicles: message plus a single Add a vehicle link (no duplicate header button)", async () => {
    vi.mocked(customerVehiclesApi.list).mockResolvedValue(ok({ data: [] }));
    render(<SavedVehiclesList />);
    expect(await screen.findByText(/You haven't saved any vehicles yet/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Add a vehicle" })).toHaveLength(1);
  });

  it("addresses: message plus a single Add an address link", async () => {
    vi.mocked(customerAddressesApi.list).mockResolvedValue(ok({ data: [] }));
    render(<SavedAddressesList />);
    expect(await screen.findByText(/You haven't saved any addresses yet/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Add an address" })).toHaveLength(1);
  });
});

describe("order cards", () => {
  it("shows a semantic status badge, total and a single link per row", async () => {
    vi.mocked(customerOrdersApi.list).mockResolvedValue(
      ok({
        data: [
          { id: 5, order_number: "TMT-0005", status: "confirmed", payment_status: "paid", grand_total: 45000, currency: "AUD", placed_at: "2026-09-01T00:00:00Z", booking: null },
          { id: 4, order_number: "TMT-0004", status: "payment_failed", payment_status: "failed", grand_total: 12000, currency: "AUD", placed_at: "2026-08-01T00:00:00Z", booking: null },
        ],
        meta: { current_page: 1, per_page: 20, total: 2, last_page: 1 },
        links: { next: null, prev: null },
      }),
    );
    render(<OrderHistoryList />);
    const rows = within(await screen.findByTestId("order-history-list")).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getAllByRole("link")).toHaveLength(1);
    expect(within(rows[0]).getByRole("link")).toHaveAttribute("href", "/orders/5");
    expect(within(rows[0]).getByText("Confirmed")).toHaveClass("bg-success");
    expect(within(rows[1]).getAllByText("Payment failed")[0]).toHaveClass("bg-black", "text-gold");
    expect(within(rows[0]).getByText("View")).toBeInTheDocument();
  });
});

describe("delete confirmation (dialog, not window.confirm)", () => {
  it("asks first, never calls remove on cancel, and removes only after confirming", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm");
    vi.mocked(customerAddressesApi.list).mockResolvedValue(ok({ data: [address()] }));
    vi.mocked(customerAddressesApi.remove).mockResolvedValue({ kind: "success", status: 204, data: undefined as never });
    render(<SavedAddressesList />);

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog", { name: "Remove this address?" });
    expect(customerAddressesApi.remove).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Keep it" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(customerAddressesApi.remove).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Yes, remove" }));
    await waitFor(() => expect(customerAddressesApi.remove).toHaveBeenCalledWith(7));
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("on a 409 the dialog closes and the row shows the returned message without a Delete button", async () => {
    const user = userEvent.setup();
    vi.mocked(customerAddressesApi.list).mockResolvedValue(ok({ data: [address()] }));
    vi.mocked(customerAddressesApi.remove).mockResolvedValue({ kind: "conflict", status: 409, message: "This address is attached to an order." });
    render(<SavedAddressesList />);

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Yes, remove" }));

    expect(await screen.findByText("This address is attached to an order.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("vehicles use the same dialog", async () => {
    const user = userEvent.setup();
    vi.mocked(customerVehiclesApi.list).mockResolvedValue(
      ok({ data: [{ id: 3, label: "Dad's car", rego: null, state: null, vin: null, vehicle_id: null, vehicle: null, saved_fitment: {}, is_default: false, created_at: null }] }),
    );
    vi.mocked(customerVehiclesApi.remove).mockResolvedValue({ kind: "success", status: 204, data: undefined as never });
    render(<SavedVehiclesList />);

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("dialog", { name: "Remove this vehicle?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yes, remove" }));
    await waitFor(() => expect(customerVehiclesApi.remove).toHaveBeenCalledWith(3));
  });
});
