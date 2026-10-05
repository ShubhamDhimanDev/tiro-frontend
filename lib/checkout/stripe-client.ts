import { loadStripe, type Stripe } from "@stripe/stripe-js";

/**
 * `loadStripe()` is documented to be called once, outside component render,
 * and memoized (the promise, not the resolved client, is what should be
 * stable across renders) — this is the standard Stripe.js/React pattern.
 *
 * **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` does not exist in any `.env` in
 * this workspace as of this round** (confirmed absent from `backend/.env`
 * too — its own `STRIPE_PUBLISHABLE_KEY` is blank). This is the one Stripe
 * key that's meant to ship to the browser by design (test-mode, safe to
 * expose client-side), but there is currently no value to expose — see the
 * completion report. `stripePromise` is `null` in that case rather than
 * calling `loadStripe("")`, which would throw; callers must check for
 * `null` and render a "payments aren't configured yet" state instead of
 * mounting `<Elements>` at all (see `components/checkout/stripe-payment-step.tsx`).
 */
let stripePromise: Promise<Stripe | null> | null | undefined;

export function getStripePromise(): Promise<Stripe | null> | null {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) return null;

  if (stripePromise === undefined) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}
