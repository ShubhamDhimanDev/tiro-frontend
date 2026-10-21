"use client";

import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/checkout/stripe-client";
import { Button } from "@/components/ui/button";
import { PaymentUnavailable } from "@/components/checkout/payment-unavailable";
import { LockIcon } from "@/components/ui/icons";

/**
 * Stripe's Payment Element: one component for cards, Apple Pay, Google Pay,
 * and native Afterpay ("don't build separate UI per method"). Client-
 * confirmation flow: `POST /api/v1/orders` has already created the
 * `PaymentIntent` server-side and returned its `client_secret`; this component
 * only confirms it.
 *
 * **Blocked on missing Stripe keys**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is
 * unset in every `.env` in this workspace (the backend's own
 * `STRIPE_PUBLISHABLE_KEY` is also blank). `getStripePromise()` returns `null`
 * in that case, and this component renders the "payment isn't available"
 * state (`<PaymentUnavailable>`) instead of mounting `<Elements>`. The request
 * flow below is built and ready; only live rendering/confirmation of the real
 * Payment Element is unverified.
 */
export function StripePaymentStep({
  clientSecret,
  returnUrl,
  orderNumber,
  onConfirmed,
  onError,
}: {
  clientSecret: string;
  returnUrl: string;
  orderNumber?: string;
  onConfirmed: () => void;
  onError: (message: string) => void;
}) {
  const stripePromise = getStripePromise();

  if (!stripePromise) {
    return <PaymentUnavailable orderNumber={orderNumber} />;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#3c8425",
            colorText: "#14110b",
            colorDanger: "#000000",
            borderRadius: "8px",
            fontSizeBase: "16px",
          },
        },
      }}
    >
      <PaymentForm returnUrl={returnUrl} onConfirmed={onConfirmed} onError={onError} />
    </Elements>
  );
}

function PaymentForm({
  returnUrl,
  onConfirmed,
  onError,
}: {
  returnUrl: string;
  onConfirmed: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;

    setSubmitting(true);

    // `redirect: "if_required"` keeps card/Apple Pay/Google Pay confirmation
    // inline (no navigation away from this page); only a genuinely
    // redirect-mandatory method (Afterpay) leaves this page, via `returnUrl`
    // (`app/checkout/return/page.tsx`).
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    setSubmitting(false);

    if (result.error) {
      onError(result.error.message ?? "We couldn't confirm your payment. Please check your details and try again.");
      return;
    }

    if (result.paymentIntent && (result.paymentIntent.status === "succeeded" || result.paymentIntent.status === "processing")) {
      onConfirmed();
    }
    // Any other status (e.g. requires_action resolved via redirect already in
    // flight) is handled by the redirect itself landing on `returnUrl`.
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement />
      <Button type="submit" fullWidth disabled={!stripe || !elements || submitting} loading={submitting}>
        {submitting ? "Confirming payment…" : "Pay now"}
      </Button>
      <p className="flex items-start gap-2 text-sm text-muted">
        <LockIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Secure payment. Your card details go straight to our payment provider and are never stored by Tiro.</span>
      </p>
    </form>
  );
}
