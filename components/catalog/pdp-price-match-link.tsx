"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";

/**
 * PDP entry point into the price-guarantee claim flow (pre-purchase — no
 * `order_id`). Per the task brief, "authenticated customers only ... this UI
 * only needs to render/link for a logged-in customer" — rather than linking
 * out to a form that will just reject a signed-out customer, this renders
 * nothing at all when signed out (or still resolving the session), same
 * "hide what a user can't use" posture as `<AuthStatus>`'s own signed-out
 * branch, just inverted (there, signed-out gets its own links; here,
 * signed-out gets nothing, since there's no useful guest action to offer —
 * `<PriceGuaranteeClaimForm>` itself has its own redundant "sign in to
 * continue" gate for anyone who reaches `/price-guarantee-claims/new`
 * directly some other way).
 */
export function PdpPriceMatchLink({ tyreVariantId, label }: { tyreVariantId: number; label: string }) {
  const { customer, loading } = useAuth();

  if (loading || !customer) return null;

  const params = new URLSearchParams({ tyre_variant_id: String(tyreVariantId), label });

  return (
    <Link
      href={`/price-guarantee-claims/new?${params.toString()}`}
      className="w-fit text-xs font-semibold text-link underline underline-offset-2 hover:text-asphalt"
    >
      Found it cheaper? Claim a price match
    </Link>
  );
}
