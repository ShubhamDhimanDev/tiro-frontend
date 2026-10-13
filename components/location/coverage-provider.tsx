"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { EMPTY_COVERAGE, type CoverageSummary } from "@/lib/locations/coverage";

const CoverageContext = createContext<CoverageSummary>(EMPTY_COVERAGE);

/**
 * What the admin panel serves (states, cities, one example suburb), built on
 * the server by `<CoverageData>` and read by client components for form
 * examples and the delivery-address state list. Outside the provider (unit
 * tests, a failed API call) it is empty and every consumer falls back to
 * neutral wording, never to a hardcoded place.
 */
export function CoverageProvider({ value, children }: { value: CoverageSummary; children: ReactNode }) {
  return <CoverageContext.Provider value={value}>{children}</CoverageContext.Provider>;
}

export function useCoverage(): CoverageSummary {
  return useContext(CoverageContext);
}
