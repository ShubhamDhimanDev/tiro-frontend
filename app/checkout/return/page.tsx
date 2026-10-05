import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatePanel } from "@/components/ui/state-panel";
import { buttonClassName } from "@/components/ui/button";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";

/**
 * Stripe's `return_url` target for redirect-mandatory payment methods
 * (Afterpay). Card/Apple Pay/Google Pay confirm inline via
 * `redirect: "if_required"` and never land here (see
 * `components/checkout/stripe-payment-step.tsx`).
 *
 * Stripe appends `payment_intent`, `payment_intent_client_secret` and
 * `redirect_status` (`succeeded`, `processing`, `requires_payment_method`,
 * `failed`, ...). This app never trusts them for state: the order page
 * (`app/orders/[order]/page.tsx`) re-fetches authoritative order/payment state
 * and shows the success or "payment pending, checking" state itself, so
 * `succeeded`/`processing`/anything unknown simply forwards there. Only a
 * clearly failed redirect is rendered here, with a way to recover. `order` (this
 * app's own query param, set when it built the `return_url`) identifies the
 * order; it must be a plain integer or it is ignored.
 */
export const metadata: Metadata = {
  title: "Finishing your payment | Tiro Mobile Tyres",
  robots: { index: false, follow: false },
};

const FAILED_STATUSES = new Set(["failed", "requires_payment_method", "canceled"]);

export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const order = first(params.order);
  const status = first(params.redirect_status);
  const orderId = order && /^\d+$/.test(order) ? order : null;

  if (!orderId) {
    redirect("/cart");
  }

  if (!status || !FAILED_STATUSES.has(status)) {
    redirect(`/orders/${orderId}`);
  }

  return (
    <div className="container-page flex max-w-2xl flex-col gap-6 py-6 md:py-10">
      <StatePanel
        tone="error"
        title="Your payment didn't go through"
        testId="payment-return-failed"
        actions={
          <>
            <Link href={`/orders/${orderId}`} className={buttonClassName()}>
              Check my order
            </Link>
            <Link href="/cart" className={buttonClassName({ variant: "secondary" })}>
              Back to cart
            </Link>
          </>
        }
      >
        Your payment provider didn&apos;t complete the payment, so you haven&apos;t been charged for this attempt. You can
        start again from your cart with another payment method, or call us on{" "}
        <a href={PHONE_HREF} className="font-semibold text-black underline underline-offset-2">
          {PHONE_DISPLAY}
        </a>{" "}
        and we&apos;ll help you finish.
      </StatePanel>
    </div>
  );
}
