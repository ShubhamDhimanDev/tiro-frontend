import type { Metadata } from "next";
import { CartPageView } from "@/components/cart/cart-page-view";

/**
 * The cart: frontend-state contents (`lib/cart/cart.ts`, localStorage-backed,
 * no server-side cart entity per docs/architecture/02-api-contract.md's
 * "Cart-to-checkout sequencing" section). Prices, promotions and the flexible
 * discount come from `POST /api/v1/cart/calculate`. Personalized/session-bound,
 * never indexed: the "SSR/client-rendered" row of the rendering-strategy plan.
 */
export const metadata: Metadata = {
  title: "Your cart | Tiro Mobile Tyres",
  description: "Review your tyres and what is included before choosing a fitting time.",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <div className="container-page flex flex-col gap-6 pb-10 pt-6 md:pt-10">
      <div>
        <h1 className="type-h2">Your cart</h1>
        <p className="mt-2 max-w-xl text-muted">Prices include GST and are per tyre, fitted at your address.</p>
      </div>
      <CartPageView />
    </div>
  );
}
