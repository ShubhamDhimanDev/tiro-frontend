/**
 * The fitting date and time picked on the PDP strip or in the checkout wizard.
 * It is only a preference stored in localStorage: nothing is held until the
 * wizard creates the real booking hold (`POST /bookings`), and the slot is
 * re-checked against live availability whenever the strip renders.
 *
 * `slot` is the slot's `HH:MM` start, or `null` when the customer chose the
 * flexible option (the server then assigns the real slot).
 */
export interface FittingSelection {
  date: string;
  slot: string | null;
  flexible: boolean;
}

const KEY = "mts_fitting_selection_v2";

export function readFittingSelection(): FittingSelection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<FittingSelection>;
    if (typeof v.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return null;
    const flexible = v.flexible === true;
    if (flexible) return { date: v.date, slot: null, flexible: true };
    if (typeof v.slot === "string" && /^\d{2}:\d{2}$/.test(v.slot)) return { date: v.date, slot: v.slot, flexible: false };
    return { date: v.date, slot: null, flexible: false };
  } catch {
    return null;
  }
}

export function writeFittingSelection(value: FittingSelection | null): void {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(KEY, JSON.stringify(value));
  else window.localStorage.removeItem(KEY);
}

/** A selection is complete when it names a time or the flexible option. */
export function isCompleteSelection(value: FittingSelection | null): value is FittingSelection {
  return Boolean(value && (value.flexible || value.slot));
}
