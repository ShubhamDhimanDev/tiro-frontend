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
