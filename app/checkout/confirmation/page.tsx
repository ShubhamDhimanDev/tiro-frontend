import type { Metadata } from "next";
import { ConfirmationView } from "@/components/checkout/confirmation-view";

/**
 * Order confirmation after the checkout wizard: `/checkout/confirmation?order=<id>`.
 * The order is fetched client-side from the API (authenticated owner or guest
 * order token), so the page is never indexed and never cached.
 */
export const metadata: Metadata = {
  title: "Order confirmed | Tiro Mobile Tyres",
  robots: { index: false, follow: false },
};

export default async function CheckoutConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { order } = await searchParams;
  const raw = Array.isArray(order) ? order[0] : order;
  const orderId = raw && /^\d+$/.test(raw) && Number(raw) > 0 ? Number(raw) : null;

  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 pb-12 pt-6 md:pt-10">
      <ConfirmationView orderId={orderId} />
    </div>
  );
}
