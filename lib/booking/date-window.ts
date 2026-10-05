/**
 * Pure date-window helper for `<AppointmentSlotPicker>`'s "Previous/Next 7
 * days" navigation. Not specified by the contract beyond the 14-day range
 * cap (`date_from`..`date_to`, inclusive) — a fixed 7-day rolling window is
 * a judgment call that trivially stays under that cap without needing raw
 * date inputs; see the completion report.
 */
export interface DateWindow {
  dateFrom: string;
  dateTo: string;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** `weekOffset` is clamped to `>= 0` by the caller (never lets the window start before today) — this function itself doesn't clamp, so it stays simple to test. */
export function weekWindow(weekOffset: number, today: Date = new Date()): DateWindow {
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  start.setUTCDate(start.getUTCDate() + weekOffset * 7);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);

  return { dateFrom: toDateString(start), dateTo: toDateString(end) };
}
