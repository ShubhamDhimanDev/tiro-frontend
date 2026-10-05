import { offersBackend } from "./backend";
import { OFFERS_REVALIDATE, OFFERS_TAG, offerDetailTag } from "./tags";
import { sortByEnd } from "./helpers";
import type { Offer, OfferResponse, OffersResponse } from "./types";

/**
 * Server-side loaders for ISR pages. They never throw: an API failure gives
 * `[]` / `null` so each page renders its empty state.
 */
export async function loadOffers(): Promise<Offer[]> {
  const result = await offersBackend.list({ next: { revalidate: OFFERS_REVALIDATE, tags: [OFFERS_TAG] } });
  if (result.status !== 200) return [];
  const data = (result.body as OffersResponse).data;
  return Array.isArray(data) ? sortByEnd(data) : [];
}

export async function loadOffer(slug: string): Promise<Offer | null> {
  const result = await offersBackend.detail(slug, {
    next: { revalidate: OFFERS_REVALIDATE, tags: [OFFERS_TAG, offerDetailTag(slug)] },
  });
  if (result.status !== 200) return null;
  return (result.body as OfferResponse).data ?? null;
}
