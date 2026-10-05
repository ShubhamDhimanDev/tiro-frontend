import type { BrandSummary, StockStatus, TyreCategory, TyreType } from "./types";

/**
 * Fixture catalogue for `lib/catalog/backend-stub.ts`. Small but varied
 * enough to exercise every UI state this build needs to demonstrate:
 * multiple models sharing one size (225/45R17), a staggered-capable model,
 * every `stock_status` value, an empty-result size, popular-size deep
 * links, and a "latest release" ordering.
 */

export type FixtureBrand = BrandSummary;

export const FIXTURE_BRANDS: FixtureBrand[] = [
  { id: 1, name: "Bridgestone", slug: "bridgestone", logo_path: null, country_of_origin: "Japan", tier: "premium" },
  { id: 2, name: "Michelin", slug: "michelin", logo_path: null, country_of_origin: "France", tier: "premium" },
  { id: 3, name: "Goodyear", slug: "goodyear", logo_path: null, country_of_origin: "United States", tier: "mid" },
];

export interface FixtureModel {
  id: number;
  slug: string;
  name: string;
  brandId: number;
  category: TyreCategory;
  tyre_type: TyreType;
  description: string;
  warranty_text: string;
  warranty_km: number;
  run_flat: boolean;
  construction: string;
  service_inclusions: string[];
  images: string[];
  released_at: string; // ISO date
}

export const FIXTURE_MODELS: FixtureModel[] = [
  {
    id: 1,
    slug: "bridgestone-turanza-t005",
    name: "Turanza T005",
    brandId: 1,
    category: "car",
    tyre_type: "highway",
    description: "A premium touring tyre engineered for confident wet-weather braking and a quiet, comfortable ride.",
    warranty_text: "5-year manufacturer warranty against defects, prorated by tread wear.",
    warranty_km: 80000,
    run_flat: false,
    construction: "radial",
    service_inclusions: ["Fitting", "Computer balancing", "Valve replacement", "Old tyre disposal"],
    images: ["/tyres/placeholder-tyre.svg"],
    released_at: "2025-11-01",
  },
  {
    id: 2,
    slug: "bridgestone-dueler-at-001",
    name: "Dueler A/T 001",
    brandId: 1,
    category: "suv",
    tyre_type: "all_terrain",
    description: "All-terrain SUV tyre balancing on-road comfort with genuine light off-road capability.",
    warranty_text: "5-year manufacturer warranty against defects, prorated by tread wear.",
    warranty_km: 70000,
    run_flat: false,
    construction: "radial",
    service_inclusions: ["Fitting", "Computer balancing", "Valve replacement", "Wheel alignment check"],
    images: ["/tyres/placeholder-tyre.svg"],
    released_at: "2025-03-15",
  },
  {
    id: 3,
    slug: "michelin-pilot-sport-4",
    name: "Pilot Sport 4",
    brandId: 2,
    category: "car",
    tyre_type: "performance",
    description: "High-performance tyre delivering sharp steering response and strong grip through corners.",
    warranty_text: "45,000km tread life warranty, conditions apply.",
    warranty_km: 45000,
    run_flat: false,
    construction: "radial",
    service_inclusions: ["Fitting", "Computer balancing", "Valve replacement"],
    images: ["/tyres/placeholder-tyre.svg"],
    released_at: "2025-08-20",
  },
  {
    id: 4,
    slug: "goodyear-wrangler-at-sa",
    name: "Wrangler AT/SA",
    brandId: 3,
    category: "4x4",
    tyre_type: "all_terrain",
    description: "Rugged all-terrain tyre built for 4x4s that spend real time off the bitumen.",
    warranty_text: "5-year manufacturer warranty against defects, prorated by tread wear.",
    warranty_km: 60000,
    run_flat: false,
    construction: "radial",
    service_inclusions: ["Fitting", "Computer balancing", "Valve replacement", "Old tyre disposal"],
    images: ["/tyres/placeholder-tyre.svg"],
    released_at: "2024-06-10",
  },
  {
    id: 5,
    slug: "michelin-primacy-4",
    name: "Primacy 4",
    brandId: 2,
    category: "car",
    tyre_type: "eco",
    description: "Low rolling-resistance touring tyre that maintains braking performance as it wears.",
    warranty_text: "5-year manufacturer warranty against defects, prorated by tread wear.",
    warranty_km: 75000,
    run_flat: false,
    construction: "radial",
    service_inclusions: ["Fitting", "Computer balancing", "Valve replacement", "Old tyre disposal"],
    images: ["/tyres/placeholder-tyre.svg"],
    released_at: "2025-12-20",
  },
];

export interface FixtureVariant {
  id: number;
  slug: string;
  sku: string;
  modelId: number;
  width: number;
  profile: number;
  rim_diameter: number;
  load_index: string;
  speed_rating: string;
  sidewall: string;
  /** cents */
  unit_price: number;
  promotional_price: number | null;
  /** stock status when the request is scoped to the one fixture zone ("1" — Melbourne Metro) */
  stock_status: StockStatus;
}

export const FIXTURE_VARIANTS: FixtureVariant[] = [
  {
    id: 101,
    slug: "bridgestone-turanza-t005-205-55-r16",
    sku: "BRT005-205-55-16",
    modelId: 1,
    width: 205,
    profile: 55,
    rim_diameter: 16,
    load_index: "91",
    speed_rating: "V",
    sidewall: "standard",
    unit_price: 18900,
    promotional_price: null,
    stock_status: "in_stock",
  },
  {
    id: 102,
    slug: "bridgestone-turanza-t005-225-45-r17",
    sku: "BRT005-225-45-17",
    modelId: 1,
    width: 225,
    profile: 45,
    rim_diameter: 17,
    load_index: "94",
    speed_rating: "W",
    sidewall: "standard",
    unit_price: 21500,
    promotional_price: 19900,
    stock_status: "limited",
  },
  {
    id: 103,
    slug: "bridgestone-dueler-at-001-265-65-r17",
    sku: "BRDAT-265-65-17",
    modelId: 2,
    width: 265,
    profile: 65,
    rim_diameter: 17,
    load_index: "112",
    speed_rating: "S",
    sidewall: "xl",
    unit_price: 32000,
    promotional_price: null,
    stock_status: "in_stock",
  },
  {
    id: 104,
    slug: "michelin-pilot-sport-4-225-45-r17",
    sku: "MIPS4-225-45-17",
    modelId: 3,
    width: 225,
    profile: 45,
    rim_diameter: 17,
    load_index: "94",
    speed_rating: "Y",
    sidewall: "standard",
    unit_price: 28900,
    promotional_price: null,
    stock_status: "in_stock",
  },
  {
    id: 105,
    slug: "michelin-pilot-sport-4-245-40-r18",
    sku: "MIPS4-245-40-18",
    modelId: 3,
    width: 245,
    profile: 40,
    rim_diameter: 18,
    load_index: "97",
    speed_rating: "Y",
    sidewall: "xl",
    unit_price: 31900,
    promotional_price: null,
    stock_status: "out_of_stock",
  },
  {
    id: 106,
    slug: "goodyear-wrangler-at-sa-265-65-r17",
    sku: "GYWAT-265-65-17",
    modelId: 4,
    width: 265,
    profile: 65,
    rim_diameter: 17,
    load_index: "112",
    speed_rating: "T",
    sidewall: "standard",
    unit_price: 29500,
    promotional_price: null,
    stock_status: "unavailable_in_zone",
  },
  {
    id: 107,
    slug: "michelin-primacy-4-195-65-r15",
    sku: "MIP4-195-65-15",
    modelId: 5,
    width: 195,
    profile: 65,
    rim_diameter: 15,
    load_index: "91",
    speed_rating: "H",
    sidewall: "standard",
    unit_price: 16900,
    promotional_price: null,
    stock_status: "in_stock",
  },
  {
    id: 108,
    slug: "michelin-primacy-4-205-55-r16",
    sku: "MIP4-205-55-16",
    modelId: 5,
    width: 205,
    profile: 55,
    rim_diameter: 16,
    load_index: "91",
    speed_rating: "V",
    sidewall: "standard",
    unit_price: 19900,
    promotional_price: null,
    stock_status: "limited",
  },
];

/** Admin-curated shortcut list — `PopularSize` per docs/architecture/01-data-model.md, not tied 1:1 to a single stocked variant. */
export const FIXTURE_POPULAR_SIZES = [
  { width: 205, profile: 55, rim_diameter: 16 },
  { width: 225, profile: 45, rim_diameter: 17 },
  { width: 265, profile: 65, rim_diameter: 17 },
  { width: 195, profile: 65, rim_diameter: 15 },
];

/** The only zone the stub knows about — "Melbourne Metro", matching `lib/location/backend-stub.ts`. */
export const FIXTURE_ZONE_ID = "1";
