/**
 * Rego (number plate) search is behind NEXT_PUBLIC_FEATURE_REGO, default OFF.
 * Read at call time so tests can toggle it; Next inlines the literal
 * `process.env.NEXT_PUBLIC_FEATURE_REGO` at build.
 */
export function isRegoEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_FEATURE_REGO;
  return v === "1" || v === "true";
}
