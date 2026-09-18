import type { VehicleFitmentAll, VehicleFitmentFrontRear, VehicleYearOption } from "./types";

/**
 * In-memory dev/test fixture data for `lib/vehicles/backend-stub.ts`.
 * Mirrors docs/architecture/02-api-contract.md's own worked example (Toyota
 * Corolla, ids 38/41/42, same fields/values) so the stub exercises the same
 * disambiguation case the contract itself documents, plus a staggered
 * vehicle (id 42, repurposed as staggered here since the contract's own
 * example is non-staggered) and a zero-fitment vehicle (id 38) — the two
 * edge cases the contract calls out explicitly — and one unambiguous
 * single-generation vehicle (Mazda 3) so not every path goes through
 * disambiguation.
 */

export interface FixtureVehicle extends VehicleYearOption {
  make: string;
  model: string;
  is_staggered: boolean;
  fitments: VehicleFitmentAll | VehicleFitmentFrontRear | Record<string, never>;
}

export const FIXTURE_VEHICLES: FixtureVehicle[] = [
  {
    id: 41,
    make: "Toyota",
    model: "Corolla",
    year_from: 2019,
    year_to: 2023,
    series: "Ascent Sport",
    body_type: "sedan",
    is_staggered: false,
    fitments: {
      all: { width: 205, profile: 55, rim_diameter: 16, load_index: "91", speed_rating: "V", confidence: "confirmed" },
    },
  },
  {
    id: 42,
    make: "Toyota",
    model: "Corolla",
    year_from: 2019,
    year_to: 2023,
    series: "Ascent Sport",
    body_type: "hatch",
    is_staggered: true,
    fitments: {
      front: { width: 215, profile: 45, rim_diameter: 17, load_index: "91", speed_rating: "W", confidence: "confirmed" },
      rear: { width: 235, profile: 40, rim_diameter: 17, load_index: "94", speed_rating: "W", confidence: "confirmed" },
    },
  },
  {
    id: 38,
    make: "Toyota",
    model: "Corolla",
    year_from: 2013,
    year_to: 2018,
    series: "Ascent",
    body_type: "sedan",
    is_staggered: false,
    fitments: {},
  },
  {
    id: 50,
    make: "Mazda",
    model: "3",
    year_from: 2014,
    year_to: 2018,
    series: null,
    body_type: "hatch",
    is_staggered: false,
    fitments: {
      all: { width: 205, profile: 60, rim_diameter: 16, load_index: "92", speed_rating: "H", confidence: "estimated" },
    },
  },
  {
    id: 60,
    make: "Holden",
    model: "Commodore",
    year_from: 2013,
    year_to: 2017,
    series: "VF",
    body_type: "sedan",
    is_staggered: false,
    fitments: {
      all: { width: 235, profile: 60, rim_diameter: 16, load_index: "100", speed_rating: "T", confidence: "confirmed" },
    },
  },
];

export const FIXTURE_MAKES: string[] = Array.from(new Set(FIXTURE_VEHICLES.map((v) => v.make))).sort();

export const FIXTURE_MODELS_BY_MAKE: Record<string, string[]> = (() => {
  const byMake: Record<string, string[]> = {};
  for (const v of FIXTURE_VEHICLES) {
    const existing = byMake[v.make] ?? [];
    if (!existing.includes(v.model)) existing.push(v.model);
    byMake[v.make] = existing;
  }
  for (const make of Object.keys(byMake)) {
    byMake[make] = [...byMake[make]].sort();
  }
  return byMake;
})();
