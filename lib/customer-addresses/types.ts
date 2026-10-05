/**
 * Shared types for the "saved addresses" account boundary —
 * `/api/v1/customer/addresses*`.
 *
 * Mirrors docs/architecture/02-api-contract.md's "Customer account
 * endpoints" section (Phase 7, added 2026-09-24) and
 * docs/architecture/01-data-model.md's `Address` section. Same "no guest
 * path at all, `auth:customer`-only" posture as `lib/customer-vehicles/types.ts`
 * — only the customer's own Sanctum bearer token, no manage-token/
 * order-token fallback.
 */

export interface CustomerAddressSuburbSummary {
  id: number;
  name: string;
  state: string;
}

export interface CustomerAddressRecord {
  id: number;
  label: string | null;
  line1: string;
  line2: string | null;
  postcode: string;
  suburb: CustomerAddressSuburbSummary;
  lat: number;
  lng: number;
  access_instructions: string | null;
  is_default: boolean;
  created_at: string | null;
}

export interface CustomerAddressListResponse {
  data: CustomerAddressRecord[];
}

export interface CustomerAddressResponse {
  data: CustomerAddressRecord;
}

/** `type` is always `fitting` server-side, not client-settable — see the contract's own note (`billing` stays unbuilt). */
export interface CustomerAddressCreateInput {
  label?: string | null;
  suburb_id: number;
  line1: string;
  line2?: string | null;
  lat: number;
  lng: number;
  access_instructions?: string | null;
}

export type CustomerAddressUpdateInput = Partial<CustomerAddressCreateInput>;

export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
}
