import { beforeEach, describe, expect, it } from "vitest";
import { addDays, describeDay, todayIso, weekCells } from "@/lib/checkout/dates";
import { DAY_PARTS, dayAvailability, dayPartOf, describeHold, groupSlots, slotsLeftLabel } from "@/lib/checkout/slots";
import { isCompleteSelection, readFittingSelection, writeFittingSelection } from "@/lib/checkout/fitting-selection";
import { EMPTY_DETAILS, EMPTY_VEHICLE, buildOrderInput, requiredWheels, validateDetails, wheelsMessage } from "@/lib/checkout/wizard";
import type { BookingDay, BookingRecord } from "@/lib/booking/types";

const address = { suburb_id: 2, line1: "12 Example St", lat: 0, lng: 0 };
const good = { firstName: "Sam", lastName: "Taylor", mobile: "0412 345 678", email: "sam@example.com", newsletter: false };

describe("wizard validation", () => {
  it("asks for every required field with a message that says how to fix it", () => {
    const errors = validateDetails(EMPTY_DETAILS, null);
    expect(Object.keys(errors).sort()).toEqual(["address", "email", "firstName", "lastName", "mobile"]);
    expect(errors.mobile).toMatch(/mobile number/i);
  });

  it("accepts a complete set of details with a matched address", () => {
    expect(validateDetails(good, address)).toEqual({});
  });

  it("rejects a malformed mobile and email", () => {
    const errors = validateDetails({ ...good, mobile: "123", email: "nope" }, address);
    expect(errors.mobile).toMatch(/Australian mobile/);
    expect(errors.email).toMatch(/@/);
  });

  it("does not accept an address that is not matched to a suburb we serve yet", () => {
    expect(validateDetails(good, { ...address, suburb_id: 0 }).address).toMatch(/not matched/);
  });

  it("needs one wheel per tyre, at most five", () => {
    expect(requiredWheels(4)).toBe(4);
    expect(requiredWheels(8)).toBe(5);
    expect(requiredWheels(0)).toBe(1);
    expect(wheelsMessage(2, 4)).toBe("Select 4 tyres to be replaced (2 selected).");
    expect(wheelsMessage(1, 1)).toBeNull();
  });
});

describe("buildOrderInput", () => {
  it("builds the POST /orders body: E.164 mobile, joined name, structured vehicle, notes and newsletter flag", () => {
    const input = buildOrderInput({
      bookingId: 55,
      details: { ...good, newsletter: true },
      address,
      vehicle: { ...EMPTY_VEHICLE, rego: " abc123 ", state: "VIC", make: "Toyota", model: "Corolla", colour: "Red", instructions: " Gate code 1234 ", wheels: ["fl", "rr"], vehicleId: 9 },
    });
    expect(input).toEqual({
      booking_id: 55,
      customer: { name: "Sam Taylor", email: "sam@example.com", mobile: "+61412345678" },
      address,
      vehicle: { rego: "abc123", state: "VIC", vehicle_id: 9, make: "Toyota", model: "Corolla", colour: "Red", wheels: ["FL", "RR"] },
      notes: "Gate code 1234",
      newsletter_opt_in: true,
    });
  });

  it("omits notes and the newsletter flag when not given, and leaves blank vehicle text out", () => {
    const input = buildOrderInput({ bookingId: 1, details: good, address, vehicle: EMPTY_VEHICLE })!;
    expect(input).not.toHaveProperty("notes");
    expect(input).not.toHaveProperty("newsletter_opt_in");
    expect(input.vehicle).toMatchObject({ rego: null, state: null, vehicle_id: null, make: undefined, wheels: [] });
  });

  it("returns null when the mobile number cannot be normalised (never sends a bad number)", () => {
    expect(buildOrderInput({ bookingId: 1, details: { ...good, mobile: "123" }, address, vehicle: EMPTY_VEHICLE })).toBeNull();
  });
});

describe("dates", () => {
  it("adds days across a month end and describes a day", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(describeDay("2026-10-02")).toBe("Friday, 2 Oct");
  });

  it("builds seven day cells and formats today locally", () => {
    const cells = weekCells("2026-10-01");
    expect(cells).toHaveLength(7);
    expect(cells[0]).toEqual({ iso: "2026-10-01", dow: "Thu", day: 1, month: "Oct" });
    expect(cells[3].dow).toBe("Sun");
    expect(todayIso(new Date(2026, 9, 1, 23, 59))).toBe("2026-10-01");
  });
});

describe("live slot presentation", () => {
  const slot = (start: string) => ({ start, end: "00:00" });

  it("puts a slot in the window its start falls in", () => {
    expect(dayPartOf("07:30")).toBe("morning");
    expect(dayPartOf("10:45")).toBe("morning");
    expect(dayPartOf("11:00")).toBe("lunch");
    expect(dayPartOf("13:45")).toBe("lunch");
    expect(dayPartOf("14:00")).toBe("afternoon");
    expect(DAY_PARTS.map((p) => p.label)).toEqual(["Morning", "Lunch", "Afternoon"]);
    const g = groupSlots([slot("08:00"), slot("11:15"), slot("15:00"), slot("09:00")]);
    expect(g.morning.map((s) => s.start)).toEqual(["08:00", "09:00"]);
    expect(g.lunch).toHaveLength(1);
    expect(g.afternoon).toHaveLength(1);
  });

  it("derives open, flexible and last-slot from the API day, never inventing availability", () => {
    expect(dayAvailability(undefined)).toMatchObject({ open: false, flexible: null, lastSlot: false, slots: [] });
    const day: BookingDay = {
      date: "2026-10-05",
      slots: [slot("09:00")],
      flexible: { available: true, window_start: "08:00", window_end: "18:00" },
    };
    expect(dayAvailability(day)).toMatchObject({ open: true, lastSlot: true, flexible: { window_start: "08:00", window_end: "18:00" } });
    const closed: BookingDay = { date: "2026-10-06", slots: [], flexible: { available: false, window_start: null, window_end: null } };
    expect(dayAvailability(closed)).toMatchObject({ open: false, flexible: null });
    expect(slotsLeftLabel(1)).toBe("1 slot left");
    expect(slotsLeftLabel(3)).toBe("3 slots left");
    expect(slotsLeftLabel(12)).toBe("12 times available");
  });

  it("describes a held booking, showing the agreed window for a flexible one", () => {
    const base: BookingRecord = {
      id: 1,
      status: "pending_hold",
      scheduled_date: "2026-10-05",
      slot_start: "09:00",
      slot_end: "09:55",
      duration_minutes: 55,
      hold_expires_at: null,
    };
    expect(describeHold(base).time).toBe("9:00 – 9:55 am");
    const flex = describeHold({ ...base, flexible: true, flexible_window: { start: "08:00", end: "18:00" } });
    expect(flex.time).toBe("Flexible: any time between 8:00 am and 6:00 pm");
    expect(flex.day).toMatch(/5 October 2026/);
  });
});

describe("fitting selection storage", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips a specific time and the flexible option", () => {
    writeFittingSelection({ date: "2026-10-05", slot: "09:00", flexible: false });
    expect(readFittingSelection()).toEqual({ date: "2026-10-05", slot: "09:00", flexible: false });
    writeFittingSelection({ date: "2026-10-05", slot: null, flexible: true });
    expect(readFittingSelection()).toEqual({ date: "2026-10-05", slot: null, flexible: true });
    writeFittingSelection(null);
    expect(readFittingSelection()).toBeNull();
  });

  it("ignores anything malformed, including the old mock-era shape", () => {
    localStorage.setItem("mts_fitting_selection_v2", "{not json");
    expect(readFittingSelection()).toBeNull();
    localStorage.setItem("mts_fitting_selection_v2", JSON.stringify({ date: "tomorrow", slot: "09:00" }));
    expect(readFittingSelection()).toBeNull();
  });

  it("is only complete once a time or the flexible option is chosen", () => {
    expect(isCompleteSelection(null)).toBe(false);
    expect(isCompleteSelection({ date: "2026-10-05", slot: null, flexible: false })).toBe(false);
    expect(isCompleteSelection({ date: "2026-10-05", slot: "09:00", flexible: false })).toBe(true);
    expect(isCompleteSelection({ date: "2026-10-05", slot: null, flexible: true })).toBe(true);
  });
});
