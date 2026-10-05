import { describe, expect, it } from "vitest";
import { formatDuration } from "@/lib/booking/format-duration";

describe("formatDuration", () => {
  it("renders sub-hour durations in minutes", () => {
    expect(formatDuration(52)).toBe("52 min");
  });

  it("renders exact hours without a minutes remainder", () => {
    expect(formatDuration(120)).toBe("2h");
  });

  it("renders hours with a minutes remainder", () => {
    expect(formatDuration(125)).toBe("2h 5m");
  });
});
