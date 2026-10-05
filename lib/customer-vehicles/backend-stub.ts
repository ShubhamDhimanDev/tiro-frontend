import type { CustomerVehiclesBackend } from "./backend-client";
import type { BackendResponse, CustomerVehicleCreateInput, CustomerVehicleRecord, CustomerVehicleUpdateInput } from "./types";

/**
 * In-memory dev/test stub for `/api/v1/customer/vehicles*`, opt-in via
 * `CUSTOMER_VEHICLES_BACKEND=stub` — see `backend.ts` for why live is the
 * default. Good enough to exercise the account-vehicles list/add/edit/
 * delete/set-default UI end-to-end without a running Laravel process.
 *
 * Same simplification `lib/price-guarantee/backend-stub.ts` flags for
 * itself: no real Sanctum session to check `token` against, so this stub
 * doesn't scope rows by customer identity the way the real backend's
 * `customer_id` filter does — every row ever created against this stub
 * (regardless of which token created it) is visible to every `list()`
 * call. `token` is still a required parameter purely so the calling Route
 * Handler's own "no session cookie -> 401 before ever reaching the
 * backend" short-circuit is exercised identically in both modes.
 */

let vehicles: CustomerVehicleRecord[] = [];
let nextId = 500;

function notFound(): BackendResponse<unknown> {
  return { status: 404, body: { message: "Not found." } };
}

function validationError(field: string, message: string): BackendResponse<unknown> {
  return { status: 422, body: { message: "The given data was invalid.", errors: { [field]: [message] } } };
}

/** Shallow shape check mirroring `StoreOrderRequest`-style server-side validation described in the contract — not a full replica, just enough to exercise the 422 path in dev. */
function isMalformedFitment(input: CustomerVehicleCreateInput["saved_fitment"] | undefined): boolean {
  if (!input || typeof input !== "object") return true;
  const keys = Object.keys(input);
  const isAll = keys.length === 1 && keys[0] === "all";
  const isFrontRear = keys.length === 2 && keys.includes("front") && keys.includes("rear");
  if (!isAll && !isFrontRear) return true;
  const sizes = isAll ? [(input as { all: unknown }).all] : [(input as { front: unknown; rear: unknown }).front, (input as { front: unknown; rear: unknown }).rear];
  return sizes.some((size) => {
    if (!size || typeof size !== "object") return true;
    const s = size as Record<string, unknown>;
    return !Number.isInteger(s.width) || !Number.isInteger(s.profile) || !Number.isInteger(s.rim_diameter);
  });
}

export const stubCustomerVehiclesBackend: CustomerVehiclesBackend = {
  async list(_token: string) {
    return { status: 200, body: { data: [...vehicles] } };
  },

  async create(_token: string, body: CustomerVehicleCreateInput) {
    if (isMalformedFitment(body.saved_fitment)) {
      return validationError("saved_fitment", "The saved fitment field has an invalid shape.");
    }

    const record: CustomerVehicleRecord = {
      id: nextId++,
      label: body.label ?? null,
      rego: body.rego ?? null,
      state: body.state ?? null,
      vin: body.vin ?? null,
      vehicle_id: body.vehicle_id ?? null,
      vehicle: null,
      saved_fitment: body.saved_fitment as CustomerVehicleRecord["saved_fitment"],
      is_default: vehicles.length === 0,
      created_at: new Date().toISOString(),
    };
    vehicles.push(record);
    return { status: 201, body: { data: record } };
  },

  async update(_token: string, id: number | string, body: CustomerVehicleUpdateInput) {
    const vehicle = vehicles.find((v) => v.id === Number(id));
    if (!vehicle) return notFound();
    if (body.saved_fitment !== undefined && isMalformedFitment(body.saved_fitment)) {
      return validationError("saved_fitment", "The saved fitment field has an invalid shape.");
    }
    Object.assign(vehicle, {
      label: body.label !== undefined ? body.label : vehicle.label,
      rego: body.rego !== undefined ? body.rego : vehicle.rego,
      state: body.state !== undefined ? body.state : vehicle.state,
      vin: body.vin !== undefined ? body.vin : vehicle.vin,
      vehicle_id: body.vehicle_id !== undefined ? body.vehicle_id : vehicle.vehicle_id,
      saved_fitment: body.saved_fitment !== undefined ? (body.saved_fitment as CustomerVehicleRecord["saved_fitment"]) : vehicle.saved_fitment,
    });
    return { status: 200, body: { data: vehicle } };
  },

  async remove(_token: string, id: number | string) {
    const before = vehicles.length;
    vehicles = vehicles.filter((v) => v.id !== Number(id));
    if (vehicles.length === before) return notFound();
    return { status: 204, body: {} };
  },

  async setDefault(_token: string, id: number | string) {
    const vehicle = vehicles.find((v) => v.id === Number(id));
    if (!vehicle) return notFound();
    vehicles.forEach((v) => (v.is_default = v.id === vehicle.id));
    return { status: 200, body: { data: vehicle } };
  },
};
