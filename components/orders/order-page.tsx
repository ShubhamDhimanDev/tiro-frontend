"use client";

import { useState } from "react";
import { OrderStatusView } from "@/components/orders/order-status";
import { useClearCartOnConfirm } from "@/components/orders/use-clear-cart-on-confirm";

/**
 * Page body for `/orders/[order]`: the heading plus the live order view.
 *
 * The order number is only known after the client-side fetch, so the heading
 * lives here, next to it. Once loaded the H1 reads "Order TMS-..." (its
 * accessible name includes the number) with "Your order" as the eyebrow above.
 * Before that, and when the order can't be loaded, it stays "Your order".
 */
export function OrderPageView({ orderId }: { orderId: number }) {
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const onOrder = useClearCartOnConfirm();

  return (
    <>
      <div>
        {orderNumber && <p className="type-eyebrow mb-1 font-bold text-black">Your order</p>}
        <h1 className="type-h2">{orderNumber ? `Order ${orderNumber}` : "Your order"}</h1>
        <p className="mt-2 max-w-xl text-muted">Keep this page handy. You can come back to it any time to check your booking.</p>
      </div>
      <OrderStatusView orderId={orderId} onOrderNumber={setOrderNumber} onOrder={onOrder} />
    </>
  );
}
