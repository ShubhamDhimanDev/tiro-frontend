import { buildFixtureOffers } from "./fixtures";
import type { OffersBackend } from "./backend-client";

/** In-memory stub for `/api/v1/offers*`, opt-in via `OFFERS_BACKEND=stub`. */
export const stubOffersBackend: OffersBackend = {
  async list(_cacheInit?: RequestInit) {
    void _cacheInit;
    return { status: 200, body: { data: buildFixtureOffers() } };
  },
  async detail(slug: string, _cacheInit?: RequestInit) {
    void _cacheInit;
    const offer = buildFixtureOffers().find((o) => o.slug === slug);
    return offer ? { status: 200, body: { data: offer } } : { status: 404, body: { message: "Not Found" } };
  },
};
