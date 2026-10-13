import type { LocationState } from "./types";

/**
 * What the admin panel currently serves, boiled down to what copy and forms
 * need. Everything here is derived from `GET /api/v1/locations` (states that
 * are switched on, cities from active zones), so changing the service area in
 * the admin changes the storefront. Nothing in this file names a place.
 *
 * Pure and serialisable: built on the server, handed to client components via
 * `<CoverageProvider>` (components/location/coverage-provider.tsx).
 */
export type CoverageSummary = {
  /** Served state codes in the API's order, e.g. `["VIC"]`. */
  stateCodes: string[];
  stateNames: string[];
  cityNames: string[];
  /** One real served suburb, for example text in forms. `null` when nothing is served. */
  example: { suburb: string; postcode: string } | null;
};

export const EMPTY_COVERAGE: CoverageSummary = { stateCodes: [], stateNames: [], cityNames: [], example: null };

export function summariseCoverage(tree: LocationState[]): CoverageSummary {
  const served = tree.filter((state) => state.cities.length > 0);
  const cities = served.flatMap((state) => state.cities);

  // Prefer a suburb that is not the city itself ("Richmond", not "Melbourne"): it reads as a suburb example.
  let example: CoverageSummary["example"] = null;
  for (const city of cities) {
    const suburb = city.suburbs.find((s) => s.name.toLowerCase() !== city.name.toLowerCase()) ?? city.suburbs[0];
    if (suburb) {
      example = { suburb: suburb.name, postcode: suburb.postcode };
      break;
    }
  }

  return {
    stateCodes: served.map((s) => s.code),
    stateNames: served.map((s) => s.name),
    cityNames: cities.map((c) => c.name),
    example,
  };
}

/** "A", "A and B", "A, B and C". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * The area as a phrase for headings: the cities when there are up to three,
 * the state when a longer list is all in one state, else a count. `null` when
 * nothing is served (callers then use neutral wording).
 */
export function areaPhrase(coverage: CoverageSummary): string | null {
  const n = coverage.cityNames.length;
  if (n === 0) return null;
  if (n <= 3) return joinNames(coverage.cityNames);
  return coverage.stateNames.length === 1 ? coverage.stateNames[0] : `${n} cities`;
}

/** Home coverage section heading. */
export function coverageHeading(coverage: CoverageSummary): string {
  const area = areaPhrase(coverage);
  return area ? `We come to you in ${area}` : "Do we come to you?";
}

/** Title of the "trusted" point on the home page. */
export function trustedTitle(coverage: CoverageSummary): string {
  const area = areaPhrase(coverage);
  return area ? `Trusted in ${area}` : "Trusted fitting, at your door";
}

/** Hint under the home page suburb box. */
export function postcodeHint(coverage: CoverageSummary): string {
  return coverage.example ? `Or a 4-digit postcode, like ${coverage.example.postcode}.` : "Or a 4-digit postcode.";
}

/** Hint under the shared "suburb or postcode" box. */
export function suburbHint(coverage: CoverageSummary): string {
  return coverage.example ? `e.g. ${coverage.example.suburb} or ${coverage.example.postcode}` : "Enter your suburb or a 4-digit postcode";
}

/**
 * The state choices for a delivery address: the served states, so a customer
 * cannot pick somewhere we do not go. Falls back to `all` when the API gave us
 * nothing (never leave the field empty), and always keeps a value that is
 * already selected (a saved address) so it does not silently blank out.
 */
export function addressStateOptions<T extends string>(coverage: CoverageSummary, all: readonly T[], current?: string): string[] {
  const served = coverage.stateCodes.length > 0 ? [...coverage.stateCodes] : [...all];
  if (current && !served.includes(current)) served.push(current);
  return served;
}
