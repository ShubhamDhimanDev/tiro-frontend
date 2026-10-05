import type { ContentPageDetail, ContentPageSummary, Faq } from "./types";

/**
 * In-memory fixture data for `backend-stub.ts`, opt-in only via
 * `CONTENT_BACKEND=stub` — see `backend.ts`. One row per `ContentPageType`
 * (plus one unpublished draft, to exercise the 404-on-draft path), and a
 * handful of `Faq` rows covering the global/`pdp`-category/page-scoped
 * cases the shared FAQ block exercises.
 */

const NOW_ISO = "2026-09-20T09:00:00+10:00";

export const FIXTURE_CONTENT_PAGES: ContentPageDetail[] = [
  {
    id: 1,
    type: "blog_post",
    title: "How Often Should You Rotate Your Tyres?",
    slug: "how-often-rotate-tyres",
    excerpt: "A quick guide to tyre rotation intervals and why they matter.",
    body: "<p>Most manufacturers recommend rotating your tyres every 10,000km to promote even wear.</p>",
    featured_image_path: "/content/blog/rotate-tyres.jpg",
    meta_title: null,
    meta_description: null,
    og_image_path: null,
    category: "maintenance-tips",
    published_at: NOW_ISO,
    updated_at: new Date(Date.parse(NOW_ISO) + 3 * 86_400_000).toISOString(),
  },
  {
    id: 2,
    type: "guide",
    title: "How to Read a Tyre Sidewall",
    slug: "read-tyre-sidewall",
    excerpt: "Decode the numbers and letters on your tyre's sidewall.",
    body: "<p>225/45R17 91V breaks down into width, profile, rim diameter, load index and speed rating.</p>",
    featured_image_path: null,
    meta_title: null,
    meta_description: null,
    og_image_path: null,
    category: "buying-guides",
    published_at: NOW_ISO,
  },
  {
    id: 3,
    type: "location_page",
    title: "Mobile Tyre Fitting in Richmond, VIC",
    slug: "richmond-vic",
    excerpt: "Mobile tyre fitting across Richmond and surrounding suburbs.",
    body: "<p>Our technicians service Richmond, Cremorne, and Burnley — book a fitting at your home or workplace.</p>",
    featured_image_path: null,
    meta_title: null,
    meta_description: null,
    og_image_path: null,
    category: null,
    published_at: NOW_ISO,
    service_zone: { id: 1, name: "Melbourne Metro" },
  },
  {
    id: 4,
    type: "promo_landing",
    title: "Spring Tyre Sale",
    slug: "spring-sale",
    excerpt: "Save on a wide range of tyres this spring.",
    body: "<p>15% off eligible tyres, fitted at your door, for a limited time.</p>",
    featured_image_path: null,
    meta_title: null,
    meta_description: null,
    og_image_path: null,
    category: null,
    published_at: NOW_ISO,
    promotion: { id: 1, name: "Spring Sale 2026", type: "percentage", value: 15, starts_at: "2026-09-01", ends_at: "2026-11-30" },
  },
  {
    id: 5,
    type: "page",
    title: "About Us",
    slug: "about-us",
    excerpt: "Who we are and how mobile fitting works.",
    body: "<p>Tiro Mobile Tyres is an Australian mobile tyre fitting service — we come to you.</p>",
    featured_image_path: null,
    meta_title: null,
    meta_description: null,
    og_image_path: null,
    category: null,
    published_at: NOW_ISO,
  },
];

// Summary-shape view of the same fixtures, for the listing endpoint (no `body`).
export const FIXTURE_CONTENT_PAGE_SUMMARIES: ContentPageSummary[] = FIXTURE_CONTENT_PAGES.map(
  ({ id, type, title, slug, excerpt, featured_image_path, meta_title, meta_description, category, published_at, updated_at }) => ({
    id,
    type,
    title,
    slug,
    excerpt,
    featured_image_path,
    meta_title,
    meta_description,
    category,
    published_at,
    updated_at,
  }),
);

export const FIXTURE_FAQS: Faq[] = [
  { id: 1, question: "Do you fit tyres at my home or workplace?", answer: "Yes — anywhere convenient, at a time that suits you.", category: "pdp", sort_order: 1 },
  { id: 2, question: "What's included in the price?", answer: "Fitting, computer balancing, new valves, and old tyre disposal.", category: "pdp", sort_order: 2 },
  { id: 3, question: "What payment methods do you accept?", answer: "Card, Apple Pay, Google Pay, and Afterpay.", category: null, sort_order: 1 },
  { id: 4, question: "Do you service Richmond?", answer: "Yes — see this page for our Richmond coverage area.", category: null, sort_order: 1 },
];

// content_page_id -> Faq[] for the page-scoped filter (fixture id 3, the Richmond location page above).
export const FIXTURE_FAQS_BY_CONTENT_PAGE_ID: Record<number, Faq[]> = {
  3: [FIXTURE_FAQS[3]],
};
