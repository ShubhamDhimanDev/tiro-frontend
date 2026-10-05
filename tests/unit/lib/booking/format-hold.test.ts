import { describe, expect, it } from "vitest";
import { dayParts, formatClock, formatDay, formatWindow, partOfDay } from "@/lib/booking/format";
import { formatMMSS, holdAnnouncement, holdTone } from "@/lib/booking/hold";

describe("booking time/date formatting", () => {
  it("formats 24-hour clock times for customers", () => {
    expect(formatClock("09:00")).toBe("9:00 am");
    expect(formatClock("00:15")).toBe("12:15 am");
    expect(formatClock("12:00")).toBe("12:00 pm");
    expect(formatClock("14:30")).toBe("2:30 pm");
    expect(formatClock("nonsense")).toBe("nonsense");
  });

  it("collapses a shared am/pm and keeps both when crossing noon", () => {
    expect(formatWindow("09:00", "09:52")).toBe("9:00 – 9:52 am");
    expect(formatWindow("11:30", "12:22")).toBe("11:30 am – 12:22 pm");
    expect(formatWindow("13:00", "14:38")).toBe("1:00 – 2:38 pm");
  });

  it("formats dates and day tiles", () => {
    expect(formatDay("2026-09-25")).toBe("Fri 25 Sep");
    expect(formatDay("2026-09-25", "long")).toBe("Friday 25 September 2026");
    expect(dayParts("2026-10-01")).toEqual({ weekday: "Thu", day: "1", month: "Oct" });
    expect(partOfDay("11:59")).toBe("morning");
    expect(partOfDay("12:00")).toBe("afternoon");
  });
});

describe("hold countdown presentation", () => {
  it("formats mm:ss and clamps at zero", () => {
    expect(formatMMSS(900)).toBe("15:00");
    expect(formatMMSS(65)).toBe("1:05");
    expect(formatMMSS(-3)).toBe("0:00");
  });

  it("changes tone under two minutes and at expiry", () => {
    expect(holdTone(600)).toBe("ok");
    expect(holdTone(120)).toBe("warn");
    expect(holdTone(0)).toBe("expired");
  });

  it("says nothing until 5 minutes, then only at thresholds", () => {
    expect(holdAnnouncement(900)).toBe("");
    expect(holdAnnouncement(301)).toBe("");
    const bands = new Set<string>();
    for (let s = 900; s >= 0; s--) bands.add(holdAnnouncement(s));
    // silent, 5 min, 2 min, 1 min, 30 s, expired
    expect(bands.size).toBe(6);
    expect(holdAnnouncement(0)).toMatch(/expired/i);
  });
});
