import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderPageView } from "@/components/orders/order-page";

/**
 * Order confirmation / guest order-tracking page:
 * `GET /api/v1/orders/{order}`, authenticated owner or guest via
 * `X-Order-Token`, mirroring `GET /api/v1/bookings/{booking}`'s auth pattern.
 * Personalized/order-specific, never indexed. All data fetching happens
 * client-side inside `<OrderStatusView>`; this shell only validates the id is a
 * plausible number before rendering it.
 */
export const metadata: Metadata = {
  title: "Your order | Tiro Mobile Tyres",
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage({ params }: { params: Promise<{ order: string }> }) {
  const { order } = await params;
  const orderId = Number(order);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();

  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 pb-12 pt-6 md:pt-10">
      <OrderPageView orderId={orderId} />
    </div>
  );
}
