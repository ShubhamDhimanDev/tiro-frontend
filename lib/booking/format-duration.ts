/** Formats a `duration_minutes` value (e.g. from `booking-slots`/`bookings`) for display, e.g. `52 min`, `1h`, `1h 5m`. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}
