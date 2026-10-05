import type { BackendResponse, SuburbRecord } from "./types";

/**
 * In-memory dev/test stub for `GET /api/v1/suburbs`, opt-in only via
 * `SUBURBS_BACKEND=stub` — see `backend.ts`. Same fixture geography as
 * `lib/location/backend-stub.ts`'s Melbourne Metro suburb list (same names/
 * postcodes, ids assigned locally) plus one deliberately ambiguous
 * name+postcode pair across two states, to exercise
 * `lib/checkout/address.ts`'s client-side disambiguation-by-state logic
 * without depending on a real backend.
 */

const FIXTURE_SUBURBS: SuburbRecord[] = [
  { id: 88, name: "Richmond", state: "VIC", postcode: "3121" },
  { id: 89, name: "Fitzroy", state: "VIC", postcode: "3065" },
  { id: 90, name: "St Kilda", state: "VIC", postcode: "3182" },
  { id: 91, name: "Brunswick", state: "VIC", postcode: "3056" },
  { id: 92, name: "South Yarra", state: "VIC", postcode: "3141" },
  { id: 93, name: "Carlton", state: "VIC", postcode: "3053" },
  { id: 94, name: "Footscray", state: "VIC", postcode: "3011" },
  { id: 95, name: "Box Hill", state: "VIC", postcode: "3128" },
  // Deliberately ambiguous pair — same name+postcode, two different states
  // (the schema's unique constraint is `(name, state_id, postcode)`, not
  // `(name, postcode)`). Real-world occurrences are rare but genuine.
  { id: 201, name: "Riverside", state: "NSW", postcode: "2000" },
  { id: 202, name: "Riverside", state: "QLD", postcode: "2000" },
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isValidPostcode(postcode: string): boolean {
  return /^\d{4}$/.test(postcode);
}

async function lookup(
  postcode: string | null,
  name: string | null
): Promise<BackendResponse<{ data: SuburbRecord[] } | { message: string; errors: Record<string, string[]> }>> {
  const errors: Record<string, string[]> = {};
  if (!postcode) errors.postcode = ["The postcode field is required."];
  else if (!isValidPostcode(postcode)) errors.postcode = ["The postcode must be a 4-digit number."];
  if (!name) errors.name = ["The name field is required."];

  if (Object.keys(errors).length > 0) {
    return { status: 422, body: { message: "The given data was invalid.", errors } };
  }

  // `name` is guaranteed non-null here — the `Object.keys(errors).length > 0`
  // early return above already covers the `!name` case, same "validated but
  // not narrowed by TS's control-flow analysis" non-null assertion style
  // `lib/location/backend-stub.ts`'s `check()` uses for `suburb!`.
  const targetName = normalize(name!);
  const data = FIXTURE_SUBURBS.filter((s) => normalize(s.name) === targetName && s.postcode === postcode);

  return { status: 200, body: { data } };
}

async function search(q: string | null): Promise<BackendResponse<unknown>> {
  const term = normalize(q ?? "");
  if (term.length < 2) {
    return { status: 422, body: { message: "The q field must be at least 2 characters.", errors: { q: ["The q field must be at least 2 characters."] } } };
  }
  const data = FIXTURE_SUBURBS.filter((s) => normalize(s.name).startsWith(term) || s.postcode.startsWith(term)).map((s) => ({
    ...s,
    label: `${s.name} ${s.state} ${s.postcode}`,
    serviceable: s.state === "VIC",
    service_zone_id: s.state === "VIC" ? 1 : null,
  }));
  return { status: 200, body: { data } };
}

export const stubSuburbsBackend = { lookup, search };
export type SuburbsBackend = typeof stubSuburbsBackend;
