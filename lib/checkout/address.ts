import { suburbsApi } from "@/lib/suburbs/client-api";

/**
 * Structured address captured from Google Places Autocomplete
 * (`components/checkout/address-autocomplete.tsx`), before it's turned into
 * an `OrderAddressInput` for `POST /api/v1/orders`.
 */
export interface PlacesAddress {
  /** The street-number + route line, e.g. "12 Example St". */
  line1: string;
  /** Unit/apartment/suite, if the picked place has one — Places doesn't reliably return this; usually left for the customer to fill in manually. */
  line2: string | null;
  suburb: string;
  state: string;
  postcode: string;
  lat: number;
  lng: number;
  /** The full formatted string Places returned, kept for display/confirmation only — never sent to the backend as-is. */
  formatted: string;
}

/**
 * Outcome of `resolveSuburbId()`. Three genuinely distinct failure shapes,
 * deliberately not collapsed into a single "couldn't resolve" bucket, so
 * `components/checkout/address-step.tsx` can show an honest, specific
 * message for each rather than a generic error:
 *
 * - `"no_match"` — `GET /api/v1/suburbs` returned no row for this
 *   postcode+name (server-side), or every row it did return belongs to a
 *   different state than the one Places picked (client-side filter below).
 *   A genuine data gap (the suburb isn't in the backend's `suburbs` table
 *   yet), not a bug in this app.
 * - `"ambiguous"` — more than one row survived the `state` filter. The
 *   contract's documented edge case: the same suburb name+postcode pair can
 *   legitimately exist in two different states (`(name, state_id,
 *   postcode)` is the unique constraint, not `(name, postcode)`), and the
 *   endpoint deliberately doesn't collapse that server-side. Structurally
 *   shouldn't happen once filtered by `state` (that's exactly what the
 *   filter is for) — modelled anyway rather than assumed away, since two
 *   rows sharing state *and* name *and* postcode would be a genuine backend
 *   data-integrity problem worth surfacing, not silently picking one.
 * - `"lookup_failed"` — the endpoint itself didn't respond as expected
 *   (network error, unexpected non-200/422 status, or the 422 malformed-
 *   postcode case — Places-sourced postcodes should always be 4 digits, but
 *   modelled defensively). Distinct from the two data cases above: this one
 *   means "we couldn't even ask", not "we asked and the data doesn't
 *   resolve".
 */
export type SuburbResolution =
  | { status: "resolved"; suburbId: number }
  | { status: "no_match" }
  | { status: "ambiguous" }
  | { status: "lookup_failed" };

/**
 * Resolves a Google Places-picked address into the `Suburb.id`
 * `POST /api/v1/orders`'s `address.suburb_id` requires, via
 * `GET /api/v1/suburbs?postcode=&name=` (backend-agent, added 2026-09-22 —
 * see docs/architecture/02-api-contract.md's "`GET /api/v1/suburbs` —
 * resolving a `Suburb.id`" section). Routed through this app's own
 * `/api/suburbs` proxy (`lib/suburbs/client-api.ts`), same "browser never
 * calls Laravel directly" posture as every other backend call in checkout.
 *
 * The endpoint can return more than one row for the same postcode+name pair
 * (same name+postcode legitimately existing in two different states — it's
 * not collapsed server-side). `state` on each row is `State.code` — the
 * same short-code format Google Places' `administrative_area_level_1` short
 * name uses — so disambiguation is a plain equality filter against
 * `address.state`, no second lookup needed. See `SuburbResolution`'s doc
 * comment for what each non-`"resolved"` outcome means and why they're kept
 * distinct rather than collapsed into one failure case.
 */
export async function resolveSuburbId(address: PlacesAddress): Promise<SuburbResolution> {
  const result = await suburbsApi.lookup(address.postcode, address.suburb);

  if (result.kind !== "success") {
    return { status: "lookup_failed" };
  }

  const candidates = result.data.data.filter((suburb) => suburb.state === address.state);

  if (candidates.length === 0) return { status: "no_match" };
  if (candidates.length > 1) return { status: "ambiguous" };
  return { status: "resolved", suburbId: candidates[0].id };
}

/**
 * Explicit sentinel submitted in place of a real `suburb_id` when
 * `resolveSuburbId()` can't resolve one (any non-`"resolved"`
 * `SuburbResolution`). `0` can never satisfy Laravel's `exists:suburbs,id`
 * rule, so this is a deliberate "let the server's own validation say so"
 * choice, not a guess at a real id — `components/checkout/checkout-flow.tsx`
 * submits the order anyway (rather than blocking submission pre-emptively)
 * so the rest of the request/response wiring stays exercisable end-to-end up
 * to the point a genuinely-unresolvable address stops it, and maps the
 * resulting `422` on `address.suburb_id` back to a clear on-screen
 * explanation instead of a raw field-name error.
 */
export const UNRESOLVED_SUBURB_ID = 0;
