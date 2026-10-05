import type { Metadata } from "next";
import Link from "next/link";
import { AccountShell } from "@/components/account/account-shell";
import { PriceGuaranteeClaimsList } from "@/components/price-guarantee/claims-list";

/**
 * "My price-match claims" — authenticated-customer-only account page (task
 * brief: "same pattern as any other account-only page in the storefront").
 * Personalized, never indexed. All data fetching happens client-side inside
 * `<PriceGuaranteeClaimsList>` (same shape as `app/orders/[order]/page.tsx`)
 * — this shell is metadata + layout only.
 */
export const metadata: Metadata = {
  title: "Your price-match claims | Tiro Mobile Tyres",
  robots: { index: false, follow: false },
};

export default function PriceGuaranteeClaimsPage() {
  return (
    <AccountShell
      title="Your price-match claims"
      description="Track every price-match claim you've submitted: pending, approved or rejected."
    >
      <PriceGuaranteeClaimsList />
      <Link href="/tyres" className="mt-6 inline-flex min-h-11 items-center font-semibold text-link underline underline-offset-4">
        Back to shop
      </Link>
    </AccountShell>
  );
}
