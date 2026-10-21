"use client";

import { useCart } from "@/components/cart/cart-provider";
import { PromoCodeForm } from "@/components/cart/promo-code-form";
import type { CartPricingState } from "@/components/cart/use-cart-pricing";
import { formatMoney } from "@/lib/catalog/format-money";

/** What is included in every price. Mirrors `lib/site/inclusions.ts`. */
const INCLUSIVE_LINE = "Onsite fitting, wheel balancing, new valves and recycling of your old tyres";

/**
 * "Inclusive" line, flexible-booking toggle and promo code, shared by the cart
 * drawer, the cart page and the checkout payment step.
 *
 * Both controls are live: the promo code is validated by `cart/calculate`
 * (a rejected code shows the API's message under the field), and the flexible
 * toggle sets the cart preference that is priced by `cart/calculate` and
 * secured by the booking hold. The saving shown is whatever the API returned,
 * never a number of ours.
 */
export function CartExtrasPanel({
  pricing,
  showInclusions = true,
  idPrefix,
}: {
  pricing: CartPricingState;
  showInclusions?: boolean;
  idPrefix?: string;
}) {
  const { state, setPromoCode, setFlexible } = useCart();
  const flexible = Boolean(state.flexible);
  const data = pricing.status === "ready" ? pricing.data : null;
  const saving = data?.flexible_discount?.amount;

  return (
    <div className="flex flex-col gap-4">
      {showInclusions && (
        <div>
          <p className="text-sm font-bold text-black">Inclusive</p>
          <p className="mt-1 text-sm text-muted">{INCLUSIVE_LINE}.</p>
        </div>
      )}
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-control bg-band p-3 text-sm text-black">
        <input
          type="checkbox"
          id={idPrefix ? `${idPrefix}-flexible` : undefined}
          checked={flexible}
          onChange={(e) => setFlexible(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-green"
        />
        <span>
          <span className="font-bold">Flexible booking discount</span>
          <span className="block text-muted">
            {saving ? (
              <>Be available at any time during the service day and save {formatMoney(saving)}.</>
            ) : (
              <>Be available at any time during the service day and save. Offered on days marked with a green dot.</>
            )}
          </span>
        </span>
      </label>
      <PromoCodeForm
        code={state.promoCode}
        pricing={pricing.status === "idle" ? "error" : pricing.status}
        promoError={pricing.status === "ready" ? (pricing.data.promo_error ?? null) : undefined}
        onApply={setPromoCode}
        onRemove={() => setPromoCode(null)}
      />
    </div>
  );
}
