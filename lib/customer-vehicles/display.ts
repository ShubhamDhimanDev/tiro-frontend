import type { CustomerVehicleRecord, SavedFitmentRecord, SavedFitmentSizeRecord } from "./types";

/**
 * Pure display helpers for saved vehicles — split out from components per
 * this codebase's standing convention of keeping pure logic independently
 * testable (see `lib/vehicles/year-groups.ts`, `lib/cart/cart.ts`).
 */

function sizeLabel(size: SavedFitmentSizeRecord): string {
  return `${size.width}/${size.profile} R${size.rim_diameter}`;
}

/** `"225/45 R17"`, `"Front 225/45 R17 · Rear 245/40 R18"`, or the zero-fitment fallback — structurally shouldn't happen on a saved row (`saved_fitment` is required at save time) but modelled defensively rather than assumed away, same posture `hasNoFitmentData` (`lib/vehicles/types.ts`) documents for the read-only fitment-result view. */
export function savedFitmentSummary(fitment: SavedFitmentRecord): string {
  if ("all" in fitment) return sizeLabel(fitment.all);
  if ("front" in fitment && "rear" in fitment) return `Front ${sizeLabel(fitment.front)} · Rear ${sizeLabel(fitment.rear)}`;
  return "No tyre size saved yet";
}

/** Per docs/architecture/01-data-model.md's `CustomerVehicle.label` note: falls back to a computed `"{make} {model}"` (or the rego, if no catalogue vehicle is linked) when `label` is null — not a required field at save time. */
export function customerVehicleDisplayLabel(vehicle: CustomerVehicleRecord): string {
  if (vehicle.label) return vehicle.label;
  if (vehicle.vehicle) return `${vehicle.vehicle.make} ${vehicle.vehicle.model}`;
  if (vehicle.rego) return vehicle.rego;
  return "Saved vehicle";
}
