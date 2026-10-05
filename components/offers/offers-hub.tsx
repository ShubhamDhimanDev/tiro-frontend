"use client";

import { useMemo, useState } from "react";
import { OfferCard } from "@/components/offers/offer-card";
import { ChipButton } from "@/components/ui/chip";
import { offerTypeKey, offerTypeLabel } from "@/lib/offers/helpers";
import type { Offer } from "@/lib/offers/types";

export type HubOffer = Offer & { endsSoon: boolean };

/**
 * Filter chips (Brand, Type, Ends soon) over the offer cards. Filtering is
 * client-side over the list the page already has (a handful of offers), so no
 * request goes out. Each chip group is a labelled group of toggle buttons
 * (`aria-pressed`); the count is a polite live region.
 */
export function OffersHub({ offers }: { offers: HubOffer[] }) {
  const [brand, setBrand] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [soon, setSoon] = useState(false);

  const brands = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of offers) if (o.brand) map.set(o.brand.slug, o.brand.name);
    return [...map.entries()].map(([slug, name]) => ({ slug, name }));
  }, [offers]);
  const types = useMemo(() => [...new Set(offers.map(offerTypeKey))], [offers]);

  const visible = offers.filter(
    (o) => (!brand || o.brand?.slug === brand) && (!type || offerTypeKey(o) === type) && (!soon || o.endsSoon),
  );
  const active = Number(brand !== null) + Number(type !== null) + Number(soon);
  const showFilters = offers.length > 1;
  const anyEndingSoon = offers.some((o) => o.endsSoon);

  function clear() {
    setBrand(null);
    setType(null);
    setSoon(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {showFilters && (
        <div className="flex flex-col gap-4" data-testid="offer-filters">
          {brands.length > 0 && (
            <fieldset className="min-w-0">
              <legend className="mb-2 text-sm font-semibold text-ink">Brand</legend>
              <div className="flex flex-wrap gap-2">
                {brands.map((b) => (
                  <ChipButton key={b.slug} selected={brand === b.slug} onClick={() => setBrand(brand === b.slug ? null : b.slug)}>
                    {b.name}
                  </ChipButton>
                ))}
              </div>
            </fieldset>
          )}
          {types.length > 1 && (
            <fieldset className="min-w-0">
              <legend className="mb-2 text-sm font-semibold text-ink">Type</legend>
              <div className="flex flex-wrap gap-2">
                {types.map((t) => (
                  <ChipButton key={t} selected={type === t} onClick={() => setType(type === t ? null : t)}>
                    {offerTypeLabel(t)}
                  </ChipButton>
                ))}
              </div>
            </fieldset>
          )}
          {anyEndingSoon && (
            <fieldset className="min-w-0">
              <legend className="mb-2 text-sm font-semibold text-ink">When</legend>
              <div className="flex flex-wrap gap-2">
                <ChipButton selected={soon} onClick={() => setSoon((v) => !v)}>
                  Ends soon
                </ChipButton>
              </div>
            </fieldset>
          )}
          <div className="flex items-center gap-4">
            <p role="status" aria-live="polite" data-testid="offer-count" className="text-sm text-muted">
              {visible.length} {visible.length === 1 ? "offer" : "offers"}
            </p>
            {active > 0 && (
              <button type="button" onClick={clear} className="inline-flex min-h-11 items-center font-semibold text-link underline underline-offset-4 hover:text-ink">
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div role="status" className="rounded-card border border-line bg-surface p-6 text-center">
          <p className="font-semibold text-ink">No offers match those filters.</p>
          <button type="button" onClick={clear} className="mt-2 inline-flex min-h-11 items-center font-semibold text-link underline underline-offset-4">
            Show all offers
          </button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((o) => (
            <li key={o.slug} className="min-w-0">
              <OfferCard offer={o} endsSoon={o.endsSoon} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
