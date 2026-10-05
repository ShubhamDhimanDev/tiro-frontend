/**
 * Public offers, `GET /api/v1/offers` and `/offers/{slug}`.
 * Contract: docs/redesign/api-contract-phase6.md section 1.
 */
export interface OfferBrand {
  name: string;
  slug: string;
  /** Storage-relative path, not a URL. */
  logo_path: string | null;
}

/** Query params for "Shop this offer". Keys are present only when the offer is scoped. */
export interface OfferShopFilters {
  brand?: string;
  category?: string;
}

export interface Offer {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  brand: OfferBrand | null;
  discount_description: string;
  badge_text: string;
  /** The promo code to type, or null for an auto-applied offer. */
  code: string | null;
  /** ISO date (YYYY-MM-DD). */
  starts_at: string;
  ends_at: string;
  terms: string | null;
  image_path: string | null;
  shop_filters: OfferShopFilters;
  /** Empty means valid in every service zone. */
  zone_ids: number[];
}

export interface OffersResponse {
  data: Offer[];
}

export interface OfferResponse {
  data: Offer;
}

export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
}
