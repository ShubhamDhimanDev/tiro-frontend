/**
 * Shared types for the Content/CMS domain — `GET /api/v1/content/pages*` and
 * `GET /api/v1/content/faqs`. Mirrors
 * docs/architecture/02-api-contract.md's "Content (CMS) endpoints" section
 * and docs/architecture/01-data-model.md's "Content / CMS & Reporting"
 * section — verified directly against the live backend this round
 * (`ContentPageController`, `FaqController`, `ContentPageSummaryResource`,
 * `ContentPageDetailResource`, `FaqResource`), same "confirm against the
 * real controller/resource, not just the doc prose" posture every prior
 * phase's domain establishes for itself.
 */

// Fixed enum, mirrored directly rather than fetched from an endpoint — same
// posture as `lib/catalog/types.ts`'s `TYRE_CATEGORIES`/`TYRE_TYPES` for
// `App\Enums\ContentPageType`.
export const CONTENT_PAGE_TYPES = ["page", "blog_post", "guide", "location_page", "promo_landing"] as const;
export type ContentPageType = (typeof CONTENT_PAGE_TYPES)[number];

/**
 * `GET /api/v1/content/pages` listing shape — no `body`. `meta_title`/
 * `meta_description` are returned exactly as authored (possibly `null`):
 * confirmed directly against `ContentPageSummaryResource`, whose own doc
 * comment states the title/excerpt fallback "is a frontend-rendering
 * concern, not something this API resolves server-side" — see
 * `lib/content/seo.ts` for where that fallback is actually applied.
 */
export interface ContentPageSummary {
  id: number;
  type: ContentPageType;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_path: string | null;
  meta_title: string | null;
  meta_description: string | null;
  category: string | null;
  published_at: string | null;
  /** Phase 6a: ISO 8601. Shown as "Updated {date}" on articles when it is later than `published_at`. */
  updated_at?: string | null;
}

/** Minimal nested summary on a `ContentPageDetail` when `service_zone_id` is set. */
export interface ContentPageServiceZoneSummary {
  id: number;
  name: string;
}

/** Minimal nested summary on a `ContentPageDetail` when `promotion_id` is set. */
export interface ContentPagePromotionSummary {
  id: number;
  name: string;
  type: string;
  value: number;
  starts_at: string;
  ends_at: string;
}

/**
 * `GET /api/v1/content/pages/{type}/{slug}` single-item shape — adds `body`
 * (rendered HTML from the admin rich-text editor; trusted, admin-authored
 * content, not user input — rendered via `dangerouslySetInnerHTML` in
 * `components/content/content-page-body.tsx`) and `og_image_path` over
 * `ContentPageSummary`, plus `service_zone`/`promotion` when linked.
 * `service_zone`/`promotion` are genuinely **absent** (not even `null`) when
 * unset, confirmed against `ContentPageDetailResource`'s `when()` guards —
 * modelled here as optional properties, not nullable ones, to match.
 */
export interface ContentPageDetail extends ContentPageSummary {
  body: string;
  og_image_path: string | null;
  service_zone?: ContentPageServiceZoneSummary;
  promotion?: ContentPagePromotionSummary;
}

export interface PaginatorMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

export interface ContentPagesResponse {
  data: ContentPageSummary[];
  meta: PaginatorMeta;
  links: Record<string, string | null>;
}

export interface ContentPageDetailResponse {
  data: ContentPageDetail;
}

/** `GET /api/v1/content/faqs` — not paginated, small/bounded set. */
export interface Faq {
  id: number;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
}

export interface FaqsResponse {
  data: Faq[];
}

export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
}
