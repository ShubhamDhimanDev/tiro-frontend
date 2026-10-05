import { describe, expect, it } from "vitest";
import { buildIcs } from "@/lib/orders/ics";

const base = {
  uid: "order-8000@tiro",
  title: "Tiro: tyre fitting",
  date: "2026-09-25",
  start: "09:00",
  end: "09:52",
  now: new Date("2026-09-20T01:02:03Z"),
};

describe("buildIcs", () => {
  it("writes a valid VCALENDAR with floating local times", () => {
    const ics = buildIcs(base)!;
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20260925T090000\r\n");
    expect(ics).toContain("DTEND:20260925T095200\r\n");
    expect(ics).toContain("DTSTAMP:20260920T010203Z\r\n");
    expect(ics).toContain("UID:order-8000@tiro\r\n");
    expect(ics).toContain("SUMMARY:Tiro: tyre fitting\r\n");
    expect(ics).not.toMatch(/DTSTART:.*Z/);
  });

  it("escapes commas, semicolons and newlines in text fields", () => {
    const ics = buildIcs({ ...base, location: "12 Example St, Richmond; VIC", description: "Line 1\nLine 2" })!;
    expect(ics).toContain("LOCATION:12 Example St\\, Richmond\\; VIC");
    expect(ics).toContain("DESCRIPTION:Line 1\\nLine 2");
  });

  it("folds long lines at 75 characters", () => {
    const ics = buildIcs({ ...base, description: "x".repeat(200) })!;
    for (const line of ics.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75);
  });

  it("returns null for an unparseable date or time", () => {
    expect(buildIcs({ ...base, date: "soon" })).toBeNull();
    expect(buildIcs({ ...base, start: "later" })).toBeNull();
  });
});
