export const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const;
export type AuState = (typeof AU_STATES)[number];

export const REGO_NO_MATCH_MESSAGE = "We couldn't match that plate. Check the state, or search by size instead.";

/** Upper-case and strip spaces/hyphens. */
export function normalisePlate(raw: string): string {
  return raw.replace(/[\s-]+/g, "").toUpperCase();
}

export type RegoValidation =
  | { ok: true; plate: string; state: AuState }
  | { ok: false; field: "plate" | "state"; message: string };

export function validateRego(rawPlate: string, state: string): RegoValidation {
  const plate = normalisePlate(rawPlate);
  if (!plate) return { ok: false, field: "plate", message: "Enter your number plate." };
  if (!/^[A-Z0-9]+$/.test(plate)) return { ok: false, field: "plate", message: "Plates use letters and numbers only." };
  if (plate.length < 2 || plate.length > 8) {
    return { ok: false, field: "plate", message: "Plates are 2 to 8 characters. Check yours and try again." };
  }
  if (!(AU_STATES as readonly string[]).includes(state)) {
    return { ok: false, field: "state", message: "Choose the state your plate is registered in." };
  }
  return { ok: true, plate, state: state as AuState };
}
