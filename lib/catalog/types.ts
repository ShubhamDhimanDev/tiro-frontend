/**
 * Shared types for the catalogue/PDP boundary.
 *
 * Mirrors docs/architecture/02-api-contract.md's "Catalogue & location
 * endpoints" section and docs/architecture/01-data-model.md's Catalogue
 * entities. Keep in sync with backend-agent's contract rather than
 * inventing local variants — see `lib/catalog/backend.ts` for why this
 * domain currently defaults to a stub.
 */

// Fixed enums — mirrored directly rather than fetched from an endpoint, per
// docs/architecture/01-data-model.md: "no separate TyreType lookup entity
// or admin CRUD needed for Phase 1; frontend/ mirrors the enum values
// directly rather than fetching an endpoint for them."
export const TYRE_CATEGORIES = ["car", "suv", "4x4", "light_truck"] as const;
export type TyreCategory = (typeof TYRE_CATEGORIES)[number];

export const TYRE_TYPES = ["highway", "all_terrain", "mud_terrain", "performance", "eco"] as const;
export type TyreType = (typeof TYRE_TYPES)[number];

export const STOCK_STATUSES = ["in_stock", "limited", "out_of_stock", "unavailable_in_zone"] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export interface BrandSummary {
  id: number;
  name: string;
  slug: string;
  logo_path: string | null;
  country_of_origin: string | null;
}

/** Nested on every `/api/v1/tyres`-shaped list item — "so frontend-agent can group into 'from $X' cards client-side without a separate model-level endpoint." */
export interface TyreModelSummary {
  id: number;
  slug: string;
  name: string;
  brand: BrandSummary;
  category: TyreCategory;
  tyre_type: TyreType;
  images: string[];
}

/**
 * `TyreVariant`-level search/browse row. `unit_price`/`promotional_price`/
 * `stock_status` are only present when the request included `zone` — the
 * contract's exact wording only names `stock_status` explicitly but says
 * items "omit stock/price fields entirely" when zone is absent (implying
 * price is also zone-gated here, consistent with "never fabricate a
 * nationwide price"). Modelled as optional/nullable and consumed
 * defensively; flagged as a judgment call in the completion report.
 */
export interface TyreListItem {
  id: number;
  slug: string;
  sku: string;
  width: number;
  profile: number;
  rim_diameter: number;
  load_index: string;
  speed_rating: string;
  sidewall: string;
  tyre_model: TyreModelSummary;
  unit_price?: number | null;
  promotional_price?: number | null;
  stock_status?: StockStatus;
}

export interface PaginatorMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface Paginator<T> {
  data: T[];
  meta: PaginatorMeta;
  links: Record<string, string | null>;
}

/** The one sanctioned exception to the flat paginator envelope. */
export interface StaggeredTyreSearchResult {
  data: {
    front: Paginator<TyreListItem>;
    rear: Paginator<TyreListItem>;
  };
}

export interface PopularSize {
  width: number;
  profile: number;
  rim_diameter: number;
}

export interface PopularSizesResponse {
  data: PopularSize[];
}

export interface BrandsResponse {
  data: BrandSummary[];
  meta?: PaginatorMeta;
  links?: Record<string, string | null>;
}

/** `GET /api/v1/tyres/{slug}` — static content only, no price/stock ever. */
export interface TyreVariantDetail {
  slug: string;
  width: number;
  profile: number;
  rim_diameter: number;
  load_index: string;
  speed_rating: string;
  sidewall: string;
  tyre_model: {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    warranty_text: string | null;
    warranty_km: number | null;
    run_flat: boolean;
    construction: string | null;
    service_inclusions: string[];
    images: string[];
    category: TyreCategory;
    tyre_type: TyreType;
    brand: BrandSummary;
  };
}

export interface TyreVariantDetailResponse {
  data: TyreVariantDetail;
}

/** `GET /api/v1/tyres/{slug}/availability?zone=` — always live-fetched, never cached. */
export interface TyreAvailability {
  unit_price: number;
  promotional_price: number | null;
  currency: string;
  stock_status: StockStatus;
  service_fee: number;
}

export interface TyreAvailabilityResponse {
  data: TyreAvailability;
}

/** Non-staggered search/filter params (`GET /api/v1/tyres`, also `/latest-releases`). */
export interface TyreSearchParams {
  width?: string;
  profile?: string;
  rim_diameter?: string;
  brand?: string;
  tyre_type?: TyreType;
  category?: TyreCategory;
  zone?: string;
  sort?: string;
  page?: string;
  per_page?: string;
}

export interface StaggeredTyreSearchParams {
  staggered: "true";
  front_width: string;
  front_profile: string;
  front_rim_diameter: string;
  rear_width: string;
  rear_profile: string;
  rear_rim_diameter: string;
  brand?: string;
  tyre_type?: TyreType;
  category?: TyreCategory;
  zone?: string;
  sort?: string;
  page?: string;
  per_page?: string;
}

export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
}
