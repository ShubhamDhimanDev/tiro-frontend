import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/location/location-provider", () => ({
  useLocation: () => ({ zone: { zoneId: "3", label: "Melbourne CBD Express" }, loading: false, clearZone: vi.fn(), openPicker: vi.fn() }),
}));
vi.mock("@/components/auth/auth-provider", () => ({ useAuth: () => ({ customer: null }) }));

const slots = vi.fn();
const create = vi.fn();
const show = vi.fn();
const cancel = vi.fn();
vi.mock("@/lib/booking/client-api", () => ({
  bookingApi: {
    slots: (...a: unknown[]) => slots(...a),
    create: (...a: unknown[]) => create(...a),
    show: (...a: unknown[]) => show(...a),
    cancel: (...a: unknown[]) => cancel(...a),
  },
}));
const calculateItems = vi.fn();
const calculateBooking = vi.fn();
vi.mock("@/lib/cart/client-api", () => ({
  cartApi: { calculateItems: (...a: unknown[]) => calculateItems(...a), calculateBooking: (...a: unknown[]) => calculateBooking(...a) },
}));
const createOrder = vi.fn();
vi.mock("@/lib/orders/client-api", () => ({ ordersApi: { create: (...a: unknown[]) => createOrder(...a) } }));
const lookup = vi.fn();
const search = vi.fn();
vi.mock("@/lib/suburbs/client-api", () => ({ suburbsApi: { lookup: (...a: unknown[]) => lookup(...a), search: (...a: unknown[]) => search(...a) } }));

import { CartProvider } from "@/components/cart/cart-provider";
import { CheckoutWizard } from "@/components/checkout/checkout-wizard";
import { addDays, todayIso } from "@/lib/checkout/dates";

const ok = (data: unknown, status = 200) => ({ kind: "success", status, data: { data } });

function priced(flexible: boolean) {
  return {
    subtotal: 75600,
    discount_total: flexible ? 1000 : 0,
    tax_total: 6000,
    service_fee_total: 0,
    grand_total: flexible ? 74600 : 75600,
    currency: "AUD",
    lines: [{ tyre_variant_id: 101, quantity: 4, unit_price: 18900, promotional_price: null, discount_amount: 0, tax_amount: 0, line_total: 75600, applied_promotion: null }],
    applied_promotions: [],
    discount_lines: flexible ? [{ type: "flexible", label: "Flexible booking discount", amount: 1000 }] : [],
    flexible_discount: flexible ? { label: "Flexible booking discount", amount: 1000 } : null,
    promo_error: null,
  };
}

const hold = (over: Record<string, unknown> = {}) => ({
  id: 55,
  status: "pending_hold",
  scheduled_date: addDays(todayIso(), 1),
  slot_start: "09:00",
  slot_end: "09:55",
  duration_minutes: 55,
  hold_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  flexible: false,
  flexible_window: null,
  promo_code: null,
  ...over,
});

function seedCart(extra: Record<string, unknown> = {}) {
  localStorage.setItem(
    "mts_cart",
    JSON.stringify({
      items: [{ tyre_variant_id: 101, quantity: 4, position: "all", label: "Bridgestone Turanza T005 205/55 R16", slug: "turanza" }],
      addons: [],
      ...extra,
    }),
  );
}

async function renderWizard(props: { resumeBookingId?: number | null } = {}) {
  const user = userEvent.setup();
  render(
    <CartProvider>
      <CheckoutWizard {...props} />
    </CartProvider>,
  );
  await screen.findByRole("dialog");
  return user;
}

/** Tomorrow is open with 3 times and a flexible window; every other day is closed. */
function mockAvailability() {
  slots.mockImplementation(async ({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) => {
    const days = [];
    for (let d = dateFrom; d <= dateTo; d = addDays(d, 1)) {
      const open = d === addDays(todayIso(), 1);
      days.push({
        date: d,
        slots: open
          ? [
              { start: "09:00", end: "09:55" },
              { start: "11:30", end: "12:25" },
              { start: "15:00", end: "15:55" },
            ]
          : [],
        flexible: { available: open, window_start: open ? "08:00" : null, window_end: open ? "18:00" : null },
      });
    }
    return ok({ duration_minutes: 55, flexible: { available: true, discount_cents: 1000, label: "Flexible arrival: save $10" }, days });
  });
}

async function pickTomorrow(user: ReturnType<typeof userEvent.setup>) {
  const strip = await screen.findByTestId("fitting-date-strip");
  const open = await waitFor(() => {
    const radio = within(within(strip).getByRole("radiogroup")).getAllByRole("radio").find((r) => !(r as HTMLButtonElement).disabled);
    expect(radio).toBeTruthy();
    return radio!;
  });
  await user.click(open);
  return strip;
}

async function fillDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/First name/), "Sam");
  await user.type(screen.getByLabelText(/Last name/), "Taylor");
  await user.type(screen.getByLabelText(/Mobile phone/), "0412 345 678");
  await user.type(screen.getByLabelText(/Email address/), "sam@example.com");
  await user.type(screen.getByLabelText("Street address"), "12 Example St");
  await user.type(screen.getByRole("combobox", { name: "Suburb" }), "Richmond");
  await user.selectOptions(screen.getByLabelText("State"), "VIC");
  await user.type(screen.getByRole("textbox", { name: "Postcode" }), "3121");
  await screen.findByText("12 Example St, Richmond VIC 3121");
  await waitFor(() => expect(screen.queryByText(/Matching this address/)).toBeNull());
}

describe("CheckoutWizard (live API)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    for (const m of [push, slots, create, show, cancel, calculateItems, calculateBooking, createOrder, lookup, search]) m.mockReset();
    search.mockResolvedValue({ kind: "success", status: 200, data: { data: [] } });
    mockAvailability();
    calculateItems.mockImplementation(async (_z: string, _i: unknown, opts: { flexible?: boolean }) => ok(priced(Boolean(opts.flexible))));
    calculateBooking.mockImplementation(async () => ok(priced(false)));
    lookup.mockResolvedValue({ kind: "success", status: 200, data: { data: [{ id: 2, name: "Richmond", state: "VIC", postcode: "3121" }] } });
    show.mockImplementation(async () => ok(hold()));
    seedCart();
  });

  it("shows an empty state instead of the wizard when the cart is empty", async () => {
    localStorage.clear();
    render(
      <CartProvider>
        <CheckoutWizard />
      </CartProvider>,
    );
    expect(await screen.findByRole("heading", { name: "Your cart is empty" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("step 1 shows live availability and the API's price, and blocks Next until a time is chosen", async () => {
    const user = await renderWizard();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { level: 2 })).toHaveTextContent("Step 1 of 4: Date & Time");
    await waitFor(() => expect(within(dialog).getByTestId("wizard-total")).toHaveTextContent("$756.00"));
    const strip = await pickTomorrow(user);
    expect(strip).toHaveTextContent("3 slots left on this day.");
    expect(within(strip).getByText("Morning")).toBeInTheDocument();
    expect(within(strip).getByText("Lunch")).toBeInTheDocument();
    expect(within(strip).getByText("Afternoon")).toBeInTheDocument();
    await user.click(screen.getByTestId("wizard-next"));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Choose a fitting date and a time/);
    expect(create).not.toHaveBeenCalled();
  });

  it("walks all four steps, holds the real time, and places the order from the held booking", async () => {
    create.mockResolvedValue(ok(hold(), 201));
    createOrder.mockResolvedValue(
      ok({ id: 900, order_number: "TMS-1", status: "pending_payment", payment_status: "pending", payment: { gateway: "stripe", client_secret: null, paypal_order_id: null } }, 201),
    );
    const user = await renderWizard();
    const strip = await pickTomorrow(user);
    await user.click(within(strip).getByText("9:00 am"));
    await user.click(screen.getByTestId("wizard-next"));

    // The slot was held for real.
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0]).toMatchObject({
      service_zone_id: "3",
      scheduled_date: addDays(todayIso(), 1),
      slot_start: "09:00",
      items: [{ tyre_variant_id: 101, quantity: 4, position: "all" }],
    });
    expect(create.mock.calls[0][1]).toMatch(/^[0-9a-f-]{36}$/);
    expect(await screen.findByText("Step 2 of 4:", { exact: false })).toBeInTheDocument();
    expect(screen.getByTestId("held-time")).toHaveTextContent("9:00 – 9:55 am");
    expect(screen.getByTestId("wizard-hold")).toHaveTextContent(/\d+:\d\d/);

    // Step 2: required fields report errors, then accept valid input.
    await user.click(screen.getByTestId("wizard-next"));
    expect(await screen.findByText("Enter your first name.")).toBeInTheDocument();
    await fillDetails(user);
    expect(screen.queryByText("Enter your first name.")).toBeNull();
    await user.click(screen.getByTestId("wizard-next"));

    // Step 3: one wheel per tyre.
    expect(screen.getByRole("dialog")).toHaveTextContent("Step 3 of 4: Select Tyres");
    await user.click(screen.getByTestId("wizard-next"));
    expect(await screen.findByText("Select 4 tyres to be replaced (0 selected).")).toBeInTheDocument();
    for (const name of ["Front left", "Front right", "Rear left", "Rear right"]) await user.click(screen.getByLabelText(name, { exact: true }));
    await user.type(screen.getByLabelText("Rego", { exact: true }), "abc123");
    await user.click(screen.getByTestId("wizard-next"));

    // Step 4: summary priced against the hold, no card form of our own.
    expect(screen.getByRole("dialog")).toHaveTextContent("Step 4 of 4: Payment");
    await waitFor(() => expect(calculateBooking).toHaveBeenCalledWith(55));
    expect(await screen.findByTestId("wizard-summary-totals")).toHaveTextContent("$756.00");
    expect(document.querySelector('input[autocomplete="cc-number"]')).toBeNull();
    await user.click(screen.getByTestId("wizard-complete"));

    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    const [input, key] = createOrder.mock.calls[0];
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(input).toMatchObject({
      booking_id: 55,
      customer: { name: "Sam Taylor", email: "sam@example.com", mobile: "+61412345678" },
      address: { suburb_id: 2, line1: "12 Example St" },
      vehicle: { rego: "ABC123", state: null, wheels: ["FL", "FR", "RL", "RR"] },
    });
    // The order exists but the gateway is not configured here: say so and keep the order number.
    expect(await screen.findByTestId("payment-not-configured")).toHaveTextContent("TMS-1");
    expect(sessionStorage.getItem("mts_order_recap_900")).toContain("Bridgestone Turanza T005");
    // The cart is NOT cleared by paying; only a confirmed order clears it.
    expect(localStorage.getItem("mts_cart")).not.toBeNull();
  }, 40_000);

  it("a slot lost to someone else shows the API's message, asks to choose again and refreshes the times", async () => {
    create.mockResolvedValue({ kind: "conflict", status: 409, message: "This slot is no longer available, please choose another." });
    const user = await renderWizard();
    const strip = await pickTomorrow(user);
    await user.click(within(strip).getByText("9:00 am"));
    const before = slots.mock.calls.length;
    await user.click(screen.getByTestId("wizard-next"));
    expect(await screen.findByRole("alert")).toHaveTextContent("This slot is no longer available, please choose another. Choose another time.");
    expect(screen.getByRole("dialog")).toHaveTextContent("Step 1 of 4:");
    await waitFor(() => expect(slots.mock.calls.length).toBeGreaterThan(before));
  });

  it("choosing the flexible option holds with flexible: true and no slot, and the cart total previews the API's discount", async () => {
    create.mockResolvedValue(ok(hold({ flexible: true, flexible_window: { start: "08:00", end: "18:00" }, slot_start: "09:00" }), 201));
    const user = await renderWizard();
    const strip = await pickTomorrow(user);
    await user.click(within(strip).getByRole("radio", { name: /I.m flexible/ }));
    await waitFor(() => expect(screen.getByTestId("wizard-total")).toHaveTextContent("$746.00"));
    await user.click(screen.getByTestId("wizard-next"));
    await waitFor(() => expect(create).toHaveBeenCalled());
    const body = create.mock.calls[0][0];
    expect(body.flexible).toBe(true);
    expect(body).not.toHaveProperty("slot_start");
    expect(await screen.findByTestId("held-time")).toHaveTextContent("Flexible: any time between 8:00 am and 6:00 pm");
  });

  it("a promo code the hold rejects offers to remove it and continue", async () => {
    seedCart({ promoCode: "OLD10" });
    create.mockResolvedValue({ kind: "validation_error", status: 422, message: "m", errors: { promo_code: ["That promo code has expired."] } });
    const user = await renderWizard();
    const strip = await pickTomorrow(user);
    await user.click(within(strip).getByText("9:00 am"));
    await user.click(screen.getByTestId("wizard-next"));
    expect(await screen.findByRole("alert")).toHaveTextContent("That promo code has expired. Your time has not been held.");
    await user.click(screen.getByRole("button", { name: "Remove the code and continue" }));
    expect(JSON.parse(localStorage.getItem("mts_cart")!)).not.toHaveProperty("promoCode");
  });

  it("an order the API rejects for the address goes back to step 2 with a message", async () => {
    create.mockResolvedValue(ok(hold(), 201));
    createOrder.mockResolvedValue({ kind: "validation_error", status: 422, message: "bad", errors: { "address.suburb_id": ["The selected address.suburb id is invalid."] } });
    const user = await renderWizard();
    const strip = await pickTomorrow(user);
    await user.click(within(strip).getByText("9:00 am"));
    await user.click(screen.getByTestId("wizard-next"));
    await screen.findByTestId("held-time");
    await fillDetails(user);
    await user.click(screen.getByTestId("wizard-next"));
    for (const name of ["Front left", "Front right", "Rear left", "Rear right"]) await user.click(await screen.findByLabelText(name, { exact: true }));
    await user.click(screen.getByTestId("wizard-next"));
    await user.click(await screen.findByTestId("wizard-complete"));
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent("Step 2 of 4: Fitting Details"));
    expect(screen.getByText(/couldn't match this address/i)).toBeInTheDocument();
  }, 40_000);

  it("an order failing on the server shows a plain message and keeps the place order button", async () => {
    create.mockResolvedValue(ok(hold(), 201));
    createOrder.mockResolvedValue({ kind: "unknown_error", status: 500, message: "We couldn't complete that just now. Please try again in a moment." });
    const user = await renderWizard();
    const strip = await pickTomorrow(user);
    await user.click(within(strip).getByText("9:00 am"));
    await user.click(screen.getByTestId("wizard-next"));
    await screen.findByTestId("held-time");
    await fillDetails(user);
    await user.click(screen.getByTestId("wizard-next"));
    for (const name of ["Front left", "Front right", "Rear left", "Rear right"]) await user.click(await screen.findByLabelText(name, { exact: true }));
    await user.click(screen.getByTestId("wizard-next"));
    await user.click(await screen.findByTestId("wizard-complete"));
    expect(await screen.findByText("We couldn't place your order")).toBeInTheDocument();
    expect(screen.getByText("We couldn't complete that just now. Please try again in a moment.")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-complete")).toBeEnabled();
  }, 40_000);

  it("re-opens an existing held booking at step 2 (/checkout?booking=)", async () => {
    show.mockResolvedValue(ok(hold({ id: 77, slot_start: "11:30", slot_end: "12:25" })));
    await renderWizard({ resumeBookingId: 77 });
    expect(await screen.findByTestId("held-time")).toHaveTextContent("11:30 am – 12:25 pm");
    expect(screen.getByRole("dialog")).toHaveTextContent("Step 2 of 4: Fitting Details");
    expect(show).toHaveBeenCalledWith(77);
    expect(create).not.toHaveBeenCalled();
  });

  it("a held booking that is gone starts at step 1 and says so", async () => {
    show.mockResolvedValue(ok(hold({ status: "expired" })));
    await renderWizard({ resumeBookingId: 77 });
    expect(await screen.findByText(/no longer held/i)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("Step 1 of 4:");
  });

  it("Return to cart on step 1 goes back to /cart", async () => {
    const user = await renderWizard();
    await user.click(screen.getByRole("button", { name: "Return to cart" }));
    expect(push).toHaveBeenCalledWith("/cart");
  });
});
