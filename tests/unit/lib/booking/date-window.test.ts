import { describe, expect, it } from "vitest";
import { weekWindow } from "@/lib/booking/date-window";

describe("weekWindow", () => {
  it("returns a 7-day inclusive window starting today at offset 0", () => {
    const today = new Date("2026-09-21T04:00:00Z");
    expect(weekWindow(0, today)).toEqual({ dateFrom: "2026-09-21", dateTo: "2026-09-27" });
  });

  it("advances a full 7 days per offset", () => {
    const today = new Date("2026-09-21T04:00:00Z");
    expect(weekWindow(1, today)).toEqual({ dateFrom: "2026-09-28", dateTo: "2026-10-04" });
  });

  it("stays within the 14-day range cap (inclusive span is 7 days, well under it)", () => {
    const today = new Date("2026-09-21T04:00:00Z");
    const { dateFrom, dateTo } = weekWindow(0, today);
    const spanDays = (new Date(`${dateTo}T00:00:00Z`).getTime() - new Date(`${dateFrom}T00:00:00Z`).getTime()) / 86_400_000;
    expect(spanDays).toBeLessThanOrEqual(14);
  });

  it("is unaffected by the local timezone offset in `today` (normalizes to UTC midnight)", () => {
    // Late-evening local time shouldn't roll the window to the next day.
    const today = new Date("2026-09-21T23:30:00+10:00");
    expect(weekWindow(0, today).dateFrom).toBe("2026-09-21");
  });
});
