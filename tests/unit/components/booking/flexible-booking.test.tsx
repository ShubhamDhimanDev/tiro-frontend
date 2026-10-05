import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const slots = vi.fn();
const create = vi.fn();
const show = vi.fn();
vi.mock("@/lib/booking/client-api", () => ({
  bookingApi: {
    slots: (...a: unknown[]) => slots(...a),
    create: (...a: unknown[]) => create(...a),
    show: (...a: unknown[]) => show(...a),
    reschedule: vi.fn(),
    cancel: vi.fn(),
  },
}));

const setPromoCode = vi.fn();
let cartState: { items: unknown[]; addons: string[]; promoCode?: string } = {
  items: [{ tyre_variant_id: 101, quantity: 4, position: "all", label: "A", slug: "a" }],
  addons: [],
};
vi.mock("@/components/cart/cart-provider", () => ({
  useCart: () => ({ state: cartState, hydrated: true, setPromoCode }),
}));
vi.mock("@/components/cart/cart-line-items", () => ({ CartLineItems: () => null }));
const pricing = vi.fn();
vi.mock("@/components/cart/use-cart-pricing", () => ({
  useCartPricing: (...a: unknown[]) => pricing(...a),
}));
vi.mock("@/components/location/location-provider", () => ({
  useLocation: () => ({ clearZone: vi.fn(), zone: { zoneId: "3", label: "Melbourne Metro" }, loading: false }),
}));

import { AppointmentSlotPicker } from "@/components/booking/appointment-slot-picker";
import { BookingFlow } from "@/components/booking/booking-flow";

function slotsResponse(over: { flexible?: unknown; dayFlexible?: unknown } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    kind: "success",
    status: 200,
    data: {
      data: {
        duration_minutes: 55,
        flexible: over.flexible ?? { available: true, discount_cents: 1000, label: "Flexible arrival: save $10" },
        days: [
          {
            date: today,
            slots: [{ start: "09:00", end: "09:55" }],
            flexible: over.dayFlexible ?? { available: true, window_start: "08:00", window_end: "18:00" },
          },
        ],
      },
    },
  };
}

describe("AppointmentSlotPicker flexible option", () => {
  beforeEach(() => {
    slots.mockReset();
    slots.mockResolvedValue(slotsResponse());
  });

  function renderPicker(props: Partial<React.ComponentProps<typeof AppointmentSlotPicker>> = {}) {
    const onSelectSlot = vi.fn();
    const onFlexibleChange = vi.fn();
    render(
      <AppointmentSlotPicker
        zoneId="3"
        items={[{ tyre_variant_id: 101, quantity: 4, position: "all" }]}
        addons={[]}
        onSelectSlot={onSelectSlot}
        onFlexibleChange={onFlexibleChange}
        pendingSlot={null}
        onZoneRejected={vi.fn()}
        {...props}
      />,
    );
    return { onSelectSlot, onFlexibleChange };
  }

  it("explains the saving and the window, and does not hold anything until confirmed", async () => {
    const user = userEvent.setup();
    const { onSelectSlot, onFlexibleChange } = renderPicker();
    const flex = await screen.findByRole("radio", { name: /Flexible arrival/ });
    expect(screen.getByTestId("flexible-option")).toHaveTextContent("Save $10.00");
    expect(screen.getByTestId("flexible-option")).toHaveTextContent("Any time between 8:00 am and 6:00 pm");

    await user.click(flex);
    expect(onFlexibleChange).toHaveBeenLastCalledWith(true);
    expect(onSelectSlot).not.toHaveBeenCalled();
    expect(screen.getByTestId("slot-confirm")).toHaveTextContent("you save $10.00");

    await user.click(screen.getByRole("button", { name: /Hold this time/ }));
    expect(onSelectSlot).toHaveBeenCalledTimes(1);
    expect(onSelectSlot.mock.calls[0][1]).toBeNull();
    expect(onSelectSlot.mock.calls[0][2]).toEqual({ flexible: true });
  });

  it("choosing a real time afterwards turns the flexible choice off", async () => {
    const user = userEvent.setup();
    const { onSelectSlot, onFlexibleChange } = renderPicker();
    await user.click(await screen.findByRole("radio", { name: /Flexible arrival/ }));
    await user.click(screen.getByRole("radio", { name: /9:00/ }));
    expect(onFlexibleChange).toHaveBeenLastCalledWith(false);
    await user.click(screen.getByRole("button", { name: /Hold this time/ }));
    expect(onSelectSlot).toHaveBeenCalledWith(expect.any(String), "09:00");
  });

  it("is a radio in the same group, reachable by keyboard", async () => {
    const user = userEvent.setup();
    renderPicker();
    const flex = await screen.findByRole("radio", { name: /Flexible arrival/ });
    expect(flex).toHaveAttribute("name", "appointment-slot");
    flex.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: /9:00/ })).toHaveFocus();
  });

  it.each([
    ["the API turns it off overall", { flexible: { available: false, discount_cents: 0, label: null } }],
    ["the day has none", { dayFlexible: { available: false, window_start: null, window_end: null } }],
  ])("is not offered when %s", async (_name, over) => {
    slots.mockResolvedValue(slotsResponse(over));
    renderPicker();
    await screen.findByRole("radio", { name: /9:00/ });
    expect(screen.queryByTestId("flexible-option")).not.toBeInTheDocument();
  });

  it("is not offered when rescheduling", async () => {
    renderPicker({ allowFlexible: false });
    await screen.findByRole("radio", { name: /9:00/ });
    expect(screen.queryByTestId("flexible-option")).not.toBeInTheDocument();
  });

  it("copes with an older API response that has no flexible fields", async () => {
    const today = new Date().toISOString().slice(0, 10);
    slots.mockResolvedValue({ kind: "success", status: 200, data: { data: { duration_minutes: 55, days: [{ date: today, slots: [{ start: "09:00", end: "09:55" }] }] } } });
    renderPicker();
    await screen.findByRole("radio", { name: /9:00/ });
    expect(screen.queryByTestId("flexible-option")).not.toBeInTheDocument();
  });
});

describe("BookingFlow with flexible and promo", () => {
  beforeEach(() => {
    slots.mockReset();
    create.mockReset();
    show.mockReset();
    setPromoCode.mockReset();
    pricing.mockReset();
    pricing.mockReturnValue({ status: "ready", data: { grand_total: 75600, currency: "AUD" } });
    slots.mockResolvedValue(slotsResponse());
    window.sessionStorage.clear();
    cartState = { items: [{ tyre_variant_id: 101, quantity: 4, position: "all", label: "A", slug: "a" }], addons: [] };
  });

  async function chooseFlexibleAndHold() {
    const user = userEvent.setup();
    render(<BookingFlow />);
    await user.click(await screen.findByRole("radio", { name: /Flexible arrival/ }));
    await user.click(screen.getByRole("button", { name: /Hold this time/ }));
    return user;
  }

  it("prices the flexible choice by asking cart/calculate with flexible: true", async () => {
    const user = userEvent.setup();
    render(<BookingFlow />);
    await user.click(await screen.findByRole("radio", { name: /Flexible arrival/ }));
    await waitFor(() => expect(pricing).toHaveBeenLastCalledWith("3", expect.any(Function), { flexible: true }));
  });

  it("creates a flexible booking with no slot_start, sending the promo code", async () => {
    cartState = { ...cartState, promoCode: "WELCOME10" };
    create.mockResolvedValue({
      kind: "success",
      status: 201,
      data: {
        data: {
          id: 55,
          status: "pending_hold",
          scheduled_date: "2026-10-05",
          slot_start: "09:00",
          slot_end: "09:55",
          duration_minutes: 55,
          hold_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
          manage_token_issued: true,
          flexible: true,
          flexible_window: { start: "08:00", end: "18:00" },
          promo_code: "WELCOME10",
        },
      },
    });
    await chooseFlexibleAndHold();

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    const body = create.mock.calls[0][0];
    expect(body).toMatchObject({ service_zone_id: "3", flexible: true, promo_code: "WELCOME10" });
    expect(body).not.toHaveProperty("slot_start");
    // the held booking explains the flexible window it was assigned inside
    expect(await screen.findByTestId("flexible-note")).toHaveTextContent("any time between 8:00 am and 6:00 pm");
  });

  it("recovers from a 409: shows the message, refetches the times and lets the customer choose again", async () => {
    create.mockResolvedValue({ kind: "conflict", status: 409, message: "This slot is no longer available, please choose another." });
    await chooseFlexibleAndHold();

    const alert = await screen.findByTestId("booking-alert");
    expect(alert).toHaveTextContent("This slot is no longer available, please choose another.");
    expect(alert).toHaveTextContent("refreshed the times");
    await waitFor(() => expect(alert).toHaveFocus());
    await waitFor(() => expect(slots.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it("a rejected promo code (422 promo_code) offers to remove the code, and nothing was held", async () => {
    cartState = { ...cartState, promoCode: "OLD" };
    create.mockResolvedValue({
      kind: "validation_error",
      status: 422,
      message: "That promo code has expired.",
      errors: { promo_code: ["That promo code has expired."] },
    });
    const user = await chooseFlexibleAndHold();

    const alert = await screen.findByTestId("booking-alert");
    expect(alert).toHaveTextContent("That promo code has expired.");
    expect(alert).toHaveTextContent("hasn't been held");
    await user.click(screen.getByRole("button", { name: "Remove the code and continue" }));
    expect(setPromoCode).toHaveBeenCalledWith(null);
  });
});
