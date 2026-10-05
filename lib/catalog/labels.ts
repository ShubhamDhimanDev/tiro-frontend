import type { TyreCategory, TyreType } from "./types";

/** Display labels for the fixed enums mirrored from docs/architecture/01-data-model.md. */
export const TYRE_TYPE_LABELS: Record<TyreType, string> = {
  highway: "Highway",
  all_terrain: "All-Terrain",
  mud_terrain: "Mud-Terrain",
  performance: "Performance",
  eco: "Eco / Low Rolling Resistance",
};

export const TYRE_CATEGORY_LABELS: Record<TyreCategory, string> = {
  car: "Passenger Car",
  suv: "SUV",
  "4x4": "4x4",
  light_truck: "Light Truck",
};

/**
 * "Brand Pattern" display name. Some API rows already prefix the model name
 * with the brand (e.g. "Bridgestone Turanza T005"); don't double it up.
 */
export function fullTyreName(brandName: string, modelName: string): string {
  return modelName.toLowerCase().startsWith(brandName.toLowerCase()) ? modelName : `${brandName} ${modelName}`;
}
