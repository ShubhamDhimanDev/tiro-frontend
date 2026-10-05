import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutWizard } from "@/components/checkout/checkout-wizard";
import { buttonClassName } from "@/components/ui/button";

/**
 * Checkout. Personalized/session-bound, never indexed: the "SSR/client-rendered"
 * row of the rendering-strategy plan.
 *
 * `/checkout` opens the 4-step wizard as a modal over a minimal page shell (live
 * availability, booking hold, order and payment: see
 * `components/checkout/checkout-wizard.tsx`). `/checkout?booking=<id>` re-opens
 * an existing held booking at step 2, which is what the booking page's
 * "Continue to checkout" link produces.
 */
export const metadata: Metadata = {
  title: "Checkout | Tiro Mobile Tyres",
  description: "Choose your fitting time, add your details and pay to lock in your mobile tyre fitting.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { booking } = await searchParams;
  const raw = Array.isArray(booking) ? booking[0] : booking;
  const bookingId = Number(raw);
  const resumeBookingId = Number.isInteger(bookingId) && bookingId > 0 ? bookingId : null;

  return (
    <div className="container-page flex flex-col gap-6 pb-10 pt-6 md:pt-10">
      {/*
        One summary, one CTA: the wizard is the checkout. Behind it is only the
        page title (closing the wizard goes back to /cart), not a second copy
        of the cart.
      */}
      <h1 className="type-h2">Checkout</h1>
      <CheckoutWizard resumeBookingId={resumeBookingId} />
      <noscript>
        <Link href="/cart" className={buttonClassName()}>
          Back to cart
        </Link>
      </noscript>
    </div>
  );
}
