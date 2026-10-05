import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartTotalsSummary } from "@/components/cart/cart-totals";
import { AppointmentSlotPicker } from "@/components/booking/appointment-slot-picker";
import { splitTyreLabel } from "@/lib/cart/label";

const slots = vi.fn();
vi.mock("@/lib/booking/client-api", () => ({ bookingApi: { slots: (...a: unknown[]) => slots(...a) } }));

describe("cart totals presentation", () => {
  it("lists auto-applied promotions as their own lines inside the totals list", () => {
    render(
      <CartTotalsSummary
        totals={{ subtotal: 40000, discount_total: 4000, tax_total: 3300, service_fee_total: 0, grand_total: 36000, currency: "AUD" }}
        appliedPromotions={[
          { id: 1, name: "4 for 3 special", type: "four_for_three", discount_amount: 3000 },
          { id: 2, name: "Spring 10% off", type: "percentage", discount_amount: 1000 },
        ]}
      />,
    );
    const lines = document.querySelectorAll("dl li");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveTextContent("4 for 3 special");
    expect(lines[0]).toHaveTextContent("-$30.00");
    expect(screen.getByText("Total").closest("div")).toHaveTextContent("$360.00");
    expect(screen.getByText(/GST is not added on top/)).toBeInTheDocument();
  });

  it("hides the service fee row while it is zero", () => {
    render(
      <CartTotalsSummary totals={{ subtotal: 100, discount_total: 0, tax_total: 9, service_fee_total: 0, grand_total: 100, currency: "AUD" }} />,
    );
    expect(screen.queryByText("Service fee")).not.toBeInTheDocument();
  });
});

describe("splitTyreLabel", () => {
  it("splits a trailing size off the tyre name", () => {
    expect(splitTyreLabel("Bridgestone Turanza T005 205/55 R16")).toEqual({ name: "Bridgestone Turanza T005", size: "205/55 R16" });
    expect(splitTyreLabel("Michelin Primacy 4")).toEqual({ name: "Michelin Primacy 4", size: null });
  });
});

describe("AppointmentSlotPicker", () => {
  beforeEach(() => {
    slots.mockReset();
    const today = new Date().toISOString().slice(0, 10);
    slots.mockResolvedValue({
      kind: "success",
      status: 200,
      data: {
        data: {
          duration_minutes: 72,
          days: [{ date: today, slots: [{ start: "09:00", end: "10:12" }, { start: "13:00", end: "14:12" }] }],
        },
      },
    });
  });

  function renderPicker() {
    const onSelectSlot = vi.fn();
    render(
      <AppointmentSlotPicker
        zoneId="1"
        items={[{ tyre_variant_id: 101, quantity: 4, position: "all" }]}
        addons={[]}
        onSelectSlot={onSelectSlot}
        pendingSlot={null}
        onZoneRejected={vi.fn()}
        totalLabel="$756.00"
        confirmNote="We will hold this time for 15 minutes."
      />,
    );
    return onSelectSlot;
  }

  it("offers slots as radio cards and never holds one until confirmed", async () => {
    const user = userEvent.setup();
    const onSelect = renderPicker();
    const radios = await screen.findAllByRole("radio", { name: /9:00|1:00/ });
    expect(radios).toHaveLength(2);

    const confirm = screen.getByRole("button", { name: /Hold this time/ });
    expect(confirm).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: /1:00/ }));
    expect(onSelect).not.toHaveBeenCalled();
    // what it means and costs is shown before anything is held
    expect(screen.getByText(/hold this time for 15 minutes/)).toBeInTheDocument();
    expect(screen.getByText("$756.00")).toBeInTheDocument();

    await user.click(confirm);
    expect(onSelect).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), "13:00");
  });

  it("offers a retry and the phone number when slots fail to load", async () => {
    slots.mockResolvedValue({ kind: "unknown_error", status: 500, message: "Couldn't load appointment times." });
    renderPicker();
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load appointment times.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
