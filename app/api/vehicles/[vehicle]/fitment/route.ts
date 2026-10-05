import { proxyResponse } from "@/lib/http/proxy-response";
import { vehiclesBackend } from "@/lib/vehicles/backend";

/**
 * GET /api/vehicles/{vehicle}/fitment — proxies `GET /api/v1/vehicles/{vehicle}/fitment`.
 * `404` means the vehicle id doesn't exist or isn't active; a valid vehicle
 * with no `VehicleFitment` rows configured yet is a `200` with
 * `fitments: {}` — both pass through unchanged so
 * `components/vehicles/vehicle-picker.tsx` / `vehicle-fitment-result.tsx`
 * can tell "real error" apart from "data-entry gap, not an error".
 */
export async function GET(_request: Request, { params }: { params: Promise<{ vehicle: string }> }) {
  const { vehicle } = await params;
  const result = await vehiclesBackend.fitment(vehicle);
  return proxyResponse(result);
}
