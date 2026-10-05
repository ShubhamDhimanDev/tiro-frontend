"use client";

import { useState } from "react";
import Link from "next/link";
import { OrderStatusView } from "@/components/orders/order-status";
import { useClearCartOnConfirm } from "@/components/orders/use-clear-cart-on-confirm";
import { buttonClassName } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/state-panel";
import { HOURS_LINE, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";

/**
 * Order confirmation after the checkout wizard: the real order
 * (`GET /orders/{id}`, via `OrderStatusView`), with its confirmed, pending,
 * failed and closed states. Nothing here is stored on the device: the order
 * number, appointment, tyres and totals all come from the API (the tyre names
 * and address come from a display recap saved at checkout, and are omitted on
 * another device).
 */
export function ConfirmationView({ orderId }: { orderId: number | null }) {
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const onOrder = useClearCartOnConfirm();

  if (orderId === null) {
    return (
      <StatePanel
        tone="info"
        title="No order to show"
        actions={
          <>
            <Link href="/tyres" className={buttonClassName({ variant: "green" })}>
              Shop tyres now
            </Link>
            <Link href="/account/orders" className={buttonClassName({ variant: "secondary" })}>
              View my orders
            </Link>
          </>
        }
      >
        Open this page from your order confirmation, or check your account for past orders.
      </StatePanel>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="type-h2">{orderNumber ? `Order ${orderNumber}` : "Your order"}</h1>
        <p className="mt-2 max-w-xl text-muted">We have emailed you the details. Keep this page handy to check your booking.</p>
      </div>
      <OrderStatusView orderId={orderId} onOrderNumber={setOrderNumber} onOrder={onOrder} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/tyres" className={buttonClassName({ variant: "green" })}>
          Keep shopping
        </Link>
        <Link href="/account/orders" className={buttonClassName({ variant: "secondary" })}>
          View my orders
        </Link>
        <p className="text-sm text-muted sm:ml-auto">
          Need to change something? Call{" "}
          <a href={PHONE_HREF} className="font-bold text-black underline underline-offset-2">
            {PHONE_DISPLAY}
          </a>{" "}
          ({HOURS_LINE}).
        </p>
      </div>
    </div>
  );
}
