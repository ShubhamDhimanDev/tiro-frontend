/**
 * Money fields across the whole API are integer cents (`18900` = $189.00),
 * currency implicit AUD — docs/architecture/02-api-contract.md's
 * "Response/pagination conventions". Every price render must go through
 * this rather than treating the raw integer as dollars.
 */
export function formatMoney(cents: number, currency = "AUD"): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(cents / 100);
}
