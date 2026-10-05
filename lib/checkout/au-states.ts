/** AU state/territory codes — shared between the manual address fallback and vehicle rego-state capture. */
export const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const;
export type AuState = (typeof AU_STATES)[number];
