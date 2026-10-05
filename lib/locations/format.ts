import type { OperatingHours } from "./types";

/** Pure helpers, safe to import from client components. */
/** Case-insensitive match on suburb name, postcode prefix, or "name postcode". */
export function suburbMatches(suburb: { name: string; postcode: string }, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    suburb.name.toLowerCase().includes(q) ||
    suburb.postcode.startsWith(q) ||
    `${suburb.name} ${suburb.postcode}`.toLowerCase().includes(q)
  );
}

const DAY_LABELS: [keyof OperatingHours, string][] = [
  ["mon", "Mon"],
  ["tue", "Tue"],
  ["wed", "Wed"],
  ["thu", "Thu"],
  ["fri", "Fri"],
  ["sat", "Sat"],
  ["sun", "Sun"],
];

function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

/** "Mon-Fri 7am-7pm, Sat 8am-4pm, Sun closed" style lines: consecutive days with equal hours are merged. */
export function summariseHours(hours: OperatingHours): string[] {
  const groups: { days: string[]; text: string }[] = [];
  for (const [key, label] of DAY_LABELS) {
    const day = hours[key];
    const text = day ? `${to12h(day.open)} to ${to12h(day.close)}` : "closed";
    const last = groups[groups.length - 1];
    if (last && last.text === text) last.days.push(label);
    else groups.push({ days: [label], text });
  }
  return groups.map((g) => `${g.days.length > 1 ? `${g.days[0]} to ${g.days[g.days.length - 1]}` : g.days[0]}: ${g.text}`);
}
