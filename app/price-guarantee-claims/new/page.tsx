import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { PageHero } from "@/components/page/page-hero";
import { PriceGuaranteeClaimForm } from "@/components/price-guarantee/claim-form";

/**
 * Price-guarantee claim submission — reached via `?tyre_variant_id=&label=`
 * (pre-purchase, from a PDP's "Claim a price match" link) or
 * `?tyre_variant_id=&order_id=&label=` (post-purchase, from an order line
 * item's equivalent link) — see `components/catalog/pdp-price-match-link.tsx`
 * and `components/orders/order-status.tsx`. Personalized/account-only, never
 * indexed.
 *
 * `tyre_variant_id` is deliberately never a manually-typed field in the form
 * below it — per the task brief, this only needs to render/link for a
 * pre-filled entry point. A direct hit on this URL without that context (no
 * `tyre_variant_id`, or a malformed one) gets guidance back to a real entry
 * point instead of a broken/empty form, same "clearly explain rather than
 * silently degrade" posture as the rest of this app's not-found-shaped
 * states.
 */
export const metadata: Metadata = {
  title: "Claim a price match | Tiro Mobile Tyres",
  robots: { index: false, follow: false },
};

export default async function NewPriceGuaranteeClaimPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tyreVariantIdRaw = Array.isArray(params.tyre_variant_id) ? params.tyre_variant_id[0] : params.tyre_variant_id;
  const orderIdRaw = Array.isArray(params.order_id) ? params.order_id[0] : params.order_id;
  const labelRaw = Array.isArray(params.label) ? params.label[0] : params.label;

  const tyreVariantId = Number(tyreVariantIdRaw);
  const orderId = orderIdRaw ? Number(orderIdRaw) : null;

  const hasValidTyreVariantId = Number.isInteger(tyreVariantId) && tyreVariantId > 0;
  const hasValidOrderId = orderId === null || (Number.isInteger(orderId) && orderId > 0);

  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Price guarantee", url: "/price-guarantee" },
    { name: "Claim a price match", url: "/price-guarantee-claims/new" },
  ];

  return (
    <>
      <PageHero
        crumbs={crumbs}
        title="Claim a price match"
        lead="Found this tyre cheaper elsewhere? Tell us where and we will review it."
        className="[&>div]:md:py-10"
      />
      <div className="container-page flex max-w-xl flex-col gap-6 py-8 md:py-12">
        {hasValidTyreVariantId && hasValidOrderId ? (
          <div className="rounded-card border border-line bg-surface p-5 shadow-rest md:p-6">
            <PriceGuaranteeClaimForm tyreVariantId={tyreVariantId} orderId={orderId} label={labelRaw ?? null} />
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-card border border-dashed border-field bg-surface p-6 text-muted">
            <p>
              Start a price-match claim from a tyre&apos;s product page (look for &ldquo;Claim a price match&rdquo;) or from
              an item in your order history. This page needs that context to know which tyre you are claiming against.
            </p>
            <Link href="/tyres" className={buttonClassName()}>
              Shop tyres
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
