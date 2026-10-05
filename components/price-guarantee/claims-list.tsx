"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { priceGuaranteeApi } from "@/lib/price-guarantee/client-api";
import { formatMoney } from "@/lib/catalog/format-money";
import { ClaimStatusBadge } from "@/components/price-guarantee/claim-status-badge";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState, ErrorNote, ListSkeleton, SignInPrompt } from "@/components/account/account-parts";
import type { PriceGuaranteeClaimRecord } from "@/lib/price-guarantee/types";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; claims: PriceGuaranteeClaimRecord[] };

/**
 * "My claims" list — `GET /api/v1/price-guarantee-claims`, the
 * authenticated customer's own claims only (server-scoped by `customer_id`,
 * not filtered client-side). Gated on `useAuth()` the same way
 * `<PriceGuaranteeClaimForm>` is — see that component's doc comment for why
 * this is UX-only, not the real security boundary.
 */
export function PriceGuaranteeClaimsList() {
  const { customer, loading: authLoading } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (authLoading || !customer) return;
    let cancelled = false;

    priceGuaranteeApi.list().then((result) => {
      if (cancelled) return;
      if (result.kind === "success") {
        setState({ status: "ready", claims: result.data.data });
        return;
      }
      setState({ status: "error", message: result.message });
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, customer]);

  if (authLoading) return <ListSkeleton />;

  if (!customer) return <SignInPrompt message="Sign in to see your price-match claims." />;

  if (state.status === "loading") return <ListSkeleton />;

  if (state.status === "error") return <ErrorNote message={state.message} />;

  if (state.claims.length === 0) {
    return (
      <EmptyState
        title="You haven't submitted any price-match claims yet. Look for “Claim a price match” on a tyre's product page or an order line item."
        action={
          <Link href="/tyres" className={buttonClassName()}>
            Browse tyres
          </Link>
        }
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {state.claims.map((claim) => (
        <li key={claim.id} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-rest md:p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-ink">Tyre variant #{claim.tyre_variant_id}</span>
            <ClaimStatusBadge status={claim.status} />
          </div>
          <p className="text-sm text-muted">
            Competitor price: {formatMoney(claim.competitor_price, "AUD")} ·{" "}
            <a href={claim.competitor_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-link underline underline-offset-4">
              view listing
            </a>
          </p>
          {claim.order_id != null && (
            <p className="text-sm text-muted">Linked to order #{claim.order_id}</p>
          )}
          {claim.status === "approved" && claim.approved_discount_amount != null && (
            <p className="text-sm font-medium text-success">
              Approved discount: {formatMoney(claim.approved_discount_amount, "AUD")}
              {claim.redeemed_at
                ? " — already applied."
                : claim.expires_at
                  ? ` — apply it to an order before ${new Date(claim.expires_at).toLocaleDateString("en-AU")}.`
                  : ""}
            </p>
          )}
          {claim.status === "rejected" && claim.admin_note && (
            <p role="alert" className="text-sm msg-error">Reason: {claim.admin_note}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
