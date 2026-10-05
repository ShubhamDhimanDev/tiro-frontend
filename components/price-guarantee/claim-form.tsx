"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { priceGuaranteeApi } from "@/lib/price-guarantee/client-api";
import { FormError, FormField, FormNotice, inputClassName, primaryButtonClassName } from "@/components/ui/form-field";

/**
 * Price-guarantee claim submission form — authenticated customers only
 * (`auth:customer`-gated on the backend, no guest path — see
 * docs/architecture/05-promotions-pricing.md's "Price-guarantee claim
 * workflow" section). `tyreVariantId` is always pre-filled by the caller
 * (the PDP's "Claim a price match" link, or an order line item's
 * equivalent link) — this form never lets a customer type an arbitrary
 * tyre-variant id; the page shell one level up (`app/price-guarantee-claims/new/page.tsx`)
 * handles the "no valid entry-point context" case before this component is
 * even reached.
 *
 * Gated on `useAuth()` here too, not just server-side: a signed-out
 * customer who reaches this page directly (bookmark, back-button after
 * logging out) sees a "log in to continue" prompt instead of a form that
 * would only fail on submit. The `POST /api/price-guarantee-claims` Route
 * Handler still enforces this independently (401 if no session cookie) as
 * the real security boundary — this is UX only, same "hides what a user
 * can't use; never the security boundary" posture the admin panel's
 * permission-aware nav already documents (docs/architecture/07-admin-auth-permissions.md §6).
 */
export function PriceGuaranteeClaimForm({
  tyreVariantId,
  orderId,
  label,
}: {
  tyreVariantId: number;
  orderId?: number | null;
  label?: string | null;
}) {
  const { customer, loading } = useAuth();

  const [competitorUrl, setCompetitorUrl] = useState("");
  const [competitorPriceDollars, setCompetitorPriceDollars] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);

  if (loading) {
    return <div className="h-48 animate-pulse rounded-md bg-chip" aria-hidden />;
  }

  if (!customer) {
    return (
      <div className="flex flex-col gap-3">
        <FormNotice message="Sign in to submit a price-match claim." />
        <Link href="/login" className={`${primaryButtonClassName} block !w-fit text-center`}>
          Log in
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col gap-3">
        <FormNotice message="Your price-match claim has been submitted. We'll review it and let you know the outcome here." />
        <Link href="/price-guarantee-claims" className="w-fit text-sm underline underline-offset-2">
          View your claims
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const dollars = Number(competitorPriceDollars);
    if (!competitorUrl || !Number.isFinite(dollars) || dollars <= 0) {
      setError("Enter a valid competitor URL and price.");
      return;
    }

    setSubmitting(true);
    const result = await priceGuaranteeApi.create({
      competitor_url: competitorUrl,
      competitor_price: Math.round(dollars * 100),
      tyre_variant_id: tyreVariantId,
      order_id: orderId ?? null,
    });
    setSubmitting(false);

    if (result.kind === "success") {
      setSuccess(true);
      return;
    }
    if (result.kind === "validation_error") {
      setFieldErrors(result.errors);
      setError(result.message);
      return;
    }
    setError(result.message);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {label && (
        <p className="text-sm text-muted">
          Claiming a price match for <span className="font-medium text-ink">{label}</span>.
        </p>
      )}
      {orderId != null && (
        <p className="text-xs text-muted">Linked to order #{orderId} (post-purchase claim).</p>
      )}

      {error && <FormError message={error} />}

      <FormField label="Competitor's product URL" htmlFor="competitor-url" error={fieldErrors.competitor_url?.[0]}>
        <input
          id="competitor-url"
          type="url"
          required
          value={competitorUrl}
          onChange={(e) => setCompetitorUrl(e.target.value)}
          placeholder="https://competitor.example.com/product"
          className={inputClassName}
        />
      </FormField>

      <FormField
        label="Competitor's price (AUD)"
        htmlFor="competitor-price"
        error={fieldErrors.competitor_price?.[0]}
        hint="Enter the price in dollars, e.g. 189.00"
      >
        <input
          id="competitor-price"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={competitorPriceDollars}
          onChange={(e) => setCompetitorPriceDollars(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      <button type="submit" disabled={submitting} className={primaryButtonClassName}>
        {submitting ? "Submitting…" : "Submit claim"}
      </button>
    </form>
  );
}
