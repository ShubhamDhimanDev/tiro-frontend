import type { ReactNode } from "react";
import { CoverageProvider } from "@/components/location/coverage-provider";
import { loadLocationTree } from "@/lib/locations/helpers";
import { summariseCoverage } from "@/lib/locations/coverage";

/**
 * Server wrapper for `<CoverageProvider>`: loads the served-area tree (the
 * same ISR-cached, `locations`-tagged fetch the footer and mega menu already
 * use, so it costs no extra request) and exposes the summary to client
 * components. Fails soft: with the API down the summary is empty.
 *
 * Reads no cookies or headers, so the pages under the root layout stay static.
 */
export async function CoverageData({ children }: { children: ReactNode }) {
  const coverage = summariseCoverage(await loadLocationTree());
  return <CoverageProvider value={coverage}>{children}</CoverageProvider>;
}
