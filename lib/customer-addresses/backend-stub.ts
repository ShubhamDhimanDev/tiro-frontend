import type { CustomerAddressesBackend } from "./backend-client";
import type { BackendResponse, CustomerAddressCreateInput, CustomerAddressRecord, CustomerAddressUpdateInput } from "./types";

/**
 * In-memory dev/test stub for `/api/v1/customer/addresses*`, opt-in via
 * `CUSTOMER_ADDRESSES_BACKEND=stub` — see `backend.ts` for why live is the
 * default. Same "no real per-token scoping" simplification
 * `lib/customer-vehicles/backend-stub.ts` flags for itself.
 *
 * **Does not replicate the "attached to an order/booking" `409` check** —
 * this stub has no real `Order`/`Booking` rows to check references against,
 * so `remove()` always succeeds. Flagged rather than half-faked: exercising
 * `<SavedAddressesList>`'s 409-handling UI needs the real backend (or a
 * component-level test that mocks `customerAddressesApi.remove` directly),
 * same "good enough for the UI, not a faithful replay of backend logic"
 * posture every other stub in this app documents for itself.
 */

let addresses: CustomerAddressRecord[] = [];
let nextId = 700;

function notFound(): BackendResponse<unknown> {
  return { status: 404, body: { message: "Not found." } };
}

export const stubCustomerAddressesBackend: CustomerAddressesBackend = {
  async list(_token: string) {
    return { status: 200, body: { data: [...addresses] } };
  },

  async create(_token: string, body: CustomerAddressCreateInput) {
    if (!body.suburb_id || !body.line1 || body.lat == null || body.lng == null) {
      return {
        status: 422,
        body: { message: "The given data was invalid.", errors: { suburb_id: ["The suburb id field is required."] } },
      };
    }

    const record: CustomerAddressRecord = {
      id: nextId++,
      label: body.label ?? null,
      line1: body.line1,
      line2: body.line2 ?? null,
      postcode: "0000",
      suburb: { id: body.suburb_id, name: "Stub Suburb", state: "VIC" },
      lat: body.lat,
      lng: body.lng,
      access_instructions: body.access_instructions ?? null,
      is_default: addresses.length === 0,
      created_at: new Date().toISOString(),
    };
    addresses.push(record);
    return { status: 201, body: { data: record } };
  },

  async update(_token: string, id: number | string, body: CustomerAddressUpdateInput) {
    const address = addresses.find((a) => a.id === Number(id));
    if (!address) return notFound();
    Object.assign(address, {
      label: body.label !== undefined ? body.label : address.label,
      line1: body.line1 !== undefined ? body.line1 : address.line1,
      line2: body.line2 !== undefined ? body.line2 : address.line2,
      lat: body.lat !== undefined ? body.lat : address.lat,
      lng: body.lng !== undefined ? body.lng : address.lng,
      access_instructions: body.access_instructions !== undefined ? body.access_instructions : address.access_instructions,
      suburb: body.suburb_id !== undefined ? { ...address.suburb, id: body.suburb_id } : address.suburb,
    });
    return { status: 200, body: { data: address } };
  },

  async remove(_token: string, id: number | string) {
    const numId = Number(id);
    const before = addresses.length;
    addresses = addresses.filter((a) => a.id !== numId);
    if (addresses.length === before) return notFound();
    return { status: 204, body: {} };
  },

  async setDefault(_token: string, id: number | string) {
    const address = addresses.find((a) => a.id === Number(id));
    if (!address) return notFound();
    addresses.forEach((a) => (a.is_default = a.id === address.id));
    return { status: 200, body: { data: address } };
  },
};
