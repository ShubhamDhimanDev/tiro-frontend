"use client";

import { useRef, useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { getPayPalScriptOptions } from "@/lib/checkout/paypal-client";
import { ordersApi } from "@/lib/orders/client-api";
import { LockIcon } from "@/components/ui/icons";
import { PaymentUnavailable } from "@/components/checkout/payment-unavailable";

/**
 * PayPal Buttons — the direct analogue of `stripe-payment-step.tsx`'s
 * Payment Element, mounted instead of it when `order.payment.gateway ===
 * "paypal"` (see `components/checkout/checkout-flow.tsx`).
 *
 * PayPal's confirmation flow is genuinely different from Stripe's, not a
 * drop-in (see docs/architecture/03-integrations.md's "PayPal as a second
 * gateway" section, point 6, and docs/architecture/02-api-contract.md's
 * `POST /api/v1/orders/{order}/paypal-capture` section):
 * - `createOrder` does NOT create a new PayPal order client-side — it just
 *   returns `paypalOrderId`, already created server-side by
 *   `POST /api/v1/orders` in the same call that returned this component's
 *   props (mirrors how `clientSecret` is already present by the time
 *   `<StripePaymentStep>` mounts, per that component's own doc comment).
 *   Creating a second PayPal order here would desync from the `Payment` row
 *   the backend already wrote.
 * - `onApprove` does NOT call PayPal's client-side capture API
 *   (`actions.order.capture()`) — capture only happens once this app's own
 *   backend endpoint is called, by design (PayPal's own recommended
 *   pattern: trusting a client-reported "approved" state is the textbook
 *   vulnerability this avoids). It calls `ordersApi.paypalCapture()`
 *   (`POST /api/orders/{id}/paypal-capture`, proxying
 *   `POST /api/v1/orders/{order}/paypal-capture`) synchronously and only
 *   treats the payment as confirmed once that call succeeds — this is NOT
 *   optional client-side-only confirmation the way Stripe's
 *   `confirmPayment()` is.
 *
 * **Blocked on missing PayPal keys, mirroring `stripe-payment-step.tsx`
 * exactly**: `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is unset in every `.env` in this
 * workspace as of this round (same situation Stripe's publishable key has
 * always been in here — see `lib/checkout/paypal-client.ts`'s doc comment).
 * `getPayPalScriptOptions()` returns `null` in that case, and this component
 * renders the same "payments aren't configured yet" state instead of
 * attempting to mount `<PayPalScriptProvider>` (which would otherwise throw
 * / render nothing useful). The component structure/request flow below is
 * built and ready — only live rendering/capture of the real PayPal Buttons
 * is unverified (no live or sandbox PayPal credentials exist anywhere in
 * this workspace, same accepted gap as Stripe's live-mode testing).
 */
export function PayPalPaymentStep({
  orderId,
  paypalOrderId,
  orderNumber,
  onConfirmed,
  onError,
}: {
  orderId: number;
  paypalOrderId: string;
  orderNumber?: string;
  onConfirmed: () => void;
  onError: (message: string) => void;
}) {
  const scriptOptions = getPayPalScriptOptions();

  if (!scriptOptions) {
    return <PaymentUnavailable orderNumber={orderNumber} />;
  }

  return (
    <PayPalScriptProvider options={scriptOptions}>
      <PayPalButtonsForm orderId={orderId} paypalOrderId={paypalOrderId} onConfirmed={onConfirmed} onError={onError} />
    </PayPalScriptProvider>
  );
}

function PayPalButtonsForm({
  orderId,
  paypalOrderId,
  onConfirmed,
  onError,
}: {
  orderId: number;
  paypalOrderId: string;
  onConfirmed: () => void;
  onError: (message: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  // Generated once per mount (one payment attempt against this order) and
  // reused across every retry of that same attempt — same "one
  // Idempotency-Key per submission-intent, never regenerated per retry"
  // discipline `checkout-flow.tsx` documents for `idempotencyKeyRef` at
  // order-creation time. Guards a double-approve (PayPal popup re-triggered,
  // `onApprove` firing twice before this component unmounts) from attempting
  // a second capture call.
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  return (
    <div className="flex flex-col gap-3">
      <PayPalButtons
        disabled={submitting}
        forceReRender={[paypalOrderId]}
        createOrder={() => Promise.resolve(paypalOrderId)}
        onApprove={async () => {
          setSubmitting(true);
          const result = await ordersApi.paypalCapture(orderId, idempotencyKeyRef.current);
          setSubmitting(false);

          if (result.kind === "success") {
            onConfirmed();
            return;
          }
          onError(result.message ?? "We couldn't confirm your PayPal payment. Please check your details and try again.");
        }}
        onError={() => {
          onError("We couldn't load PayPal. Please try again or use another payment method.");
        }}
      />
      <p className="flex items-start gap-2 text-sm text-muted">
        <LockIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Secure payment through PayPal. We never see or store your payment details.</span>
      </p>
      {submitting && (
        <p role="status" className="text-sm text-muted">
          Confirming payment…
        </p>
      )}
    </div>
  );
}
