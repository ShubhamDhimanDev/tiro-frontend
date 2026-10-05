"use client";

import { PriceTick } from "@/components/motion/price-tick";
import { formatMoney } from "@/lib/catalog/format-money";
import { enabledBnplProviders, instalmentCents, type BnplProvider } from "@/lib/payments/bnpl";

const LABEL: Record<BnplProvider, string> = { afterpay: "Afterpay", paypal: "PayPal", zip: "Zip" };

/**
 * "Pay in 4" lines under Add to cart. With a known total each fixed-instalment
 * provider shows its payment amount; without one (no location yet) it falls
 * back to the generic sentence. Provider names are plain text (no third-party
 * logos until brand assets are cleared).
 */
export function BnplLines({ totalCents, currency = "AUD" }: { totalCents: number | null; currency?: string }) {
  const providers = enabledBnplProviders();
  if (providers.length === 0) return null;

  if (totalCents === null || totalCents <= 0) {
    return (
      <p className="rounded-control bg-band px-3 py-2 text-xs text-muted">
        Pay in instalments with {providers.map((p) => LABEL[p]).join(", ")} at checkout.
      </p>
    );
  }

  const each = formatMoney(instalmentCents(totalCents), currency);
  return (
    <ul data-testid="bnpl-lines" className="flex flex-col gap-1.5 rounded-control bg-band px-3 py-2.5 text-xs text-black">
      {providers.map((p) =>
        p === "zip" ? (
          <li key={p}>
            Or pay nothing today with <b>{LABEL[p]}</b>.
          </li>
        ) : (
          <li key={p}>
            Pay in 4 interest-free payments of <b className="type-mono"><PriceTick value={each} /></b> with <b>{LABEL[p]}</b>.
          </li>
        ),
      )}
      <li className="text-muted">Eligibility and limits are confirmed by the provider at checkout.</li>
    </ul>
  );
}
