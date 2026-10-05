/**
 * Buy-now-pay-later messaging for the PDP. Providers shown are controlled by
 * `NEXT_PUBLIC_BNPL_PROVIDERS` (comma list of `afterpay`, `paypal`, `zip`),
 * defaulting to the two that checkout already supports (Stripe's Afterpay and
 * PayPal). Set it to an empty string to hide the block. Amounts are indicative
 * (total / 4, rounded up to the cent); eligibility limits are decided by the
 * provider at checkout.
 */
export type BnplProvider = "afterpay" | "paypal" | "zip";

const KNOWN: BnplProvider[] = ["afterpay", "paypal", "zip"];

export function enabledBnplProviders(raw: string | undefined = process.env.NEXT_PUBLIC_BNPL_PROVIDERS): BnplProvider[] {
  const source = raw === undefined ? "afterpay,paypal" : raw;
  return source
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is BnplProvider => (KNOWN as string[]).includes(p));
}

/** A quarter of the total in cents, rounded up so four payments never fall short. */
export function instalmentCents(totalCents: number): number {
  return Math.ceil(totalCents / 4);
}
