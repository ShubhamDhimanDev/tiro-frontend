import type { AuState } from "./validate";

/**
 * Rego lookup adapter. TODO(phase-7): wire the vendor via a Route Handler
 * (rate limited, vehicle data only, never the owner). Until then every call
 * returns `not_implemented`, and the Rego tab is hidden by default anyway
 * (see ./flag.ts).
 */
export type RegoLookupResult =
  | { kind: "success"; vehicleId: number; description: string }
  | { kind: "no_match" }
  | { kind: "not_implemented" }
  | { kind: "error"; message: string };

export type RegoLookup = (input: { plate: string; state: AuState }) => Promise<RegoLookupResult>;

export const lookupRego: RegoLookup = async () => ({ kind: "not_implemented" });
