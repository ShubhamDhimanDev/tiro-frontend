import type { ReactPayPalScriptOptions } from "@paypal/react-paypal-js";

/**
 * PayPal JS SDK script options for `<PayPalScriptProvider>`
 * (`@paypal/react-paypal-js`) — the direct analogue of `stripe-client.ts`'s
 * `getStripePromise()`, mirroring its exact graceful-degradation discipline.
 *
 * **`NEXT_PUBLIC_PAYPAL_CLIENT_ID` does not exist in any `.env` in this
 * workspace as of this round** (same posture as
 * `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — confirmed absent from `.env.local`
 * and from `backend/.env`, whose own `PAYPAL_CLIENT_ID` is also blank; no
 * live or sandbox PayPal credentials exist anywhere in this workspace, per
 * docs/architecture/03-integrations.md's PayPal section, "Known gap"). This
 * is the one PayPal credential that's meant to ship to the browser by
 * design (a client id, not a secret — PayPal's JS SDK loads publicly keyed
 * to it, same trust model as Stripe's publishable key), but there is
 * currently no value to expose. `getPayPalScriptOptions()` returns `null` in
 * that case rather than handing `PayPalScriptProvider` an empty `clientId`
 * (which would load PayPal's JS SDK against a malformed script URL and fail
 * loudly in the browser); callers must check for `null` and render a
 * "payments aren't configured yet" state instead of mounting
 * `<PayPalScriptProvider>` at all (see
 * `components/checkout/paypal-payment-step.tsx`).
 *
 * Unlike `getStripePromise()`, there's no SDK-loading promise to memoize
 * here — `PayPalScriptProvider` (the React wrapper component itself) owns
 * its own script-load lifecycle/caching internally, keyed off its `options`
 * prop; this function only has to resolve that options object, not manage a
 * module-level promise.
 *
 * `currency`/`intent` are fixed here (`AUD`, matching every other money
 * field in this app per the "Currency is implicit AUD for MVP" convention;
 * `capture`, matching the backend's `intent = CAPTURE` Order v2 resource per
 * docs/architecture/02-api-contract.md's `POST /api/v1/orders` section)
 * rather than parameterised — nothing in this app ever creates a PayPal
 * order in a different currency or intent.
 */
export function getPayPalScriptOptions(): ReactPayPalScriptOptions | null {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  if (!clientId) return null;

  return {
    clientId,
    currency: "AUD",
    intent: "capture",
  };
}
