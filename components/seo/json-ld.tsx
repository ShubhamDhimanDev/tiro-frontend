/**
 * Structured data helpers. "Structured data (Product, LocalBusiness/Service
 * per location page, FAQPage, BreadcrumbList) is part of 'done' for any
 * indexable page, not an afterthought" (task brief). Product + FAQPage +
 * BreadcrumbList shipped in the Phase 1 round (PDP, browse pages);
 * `LocalBusinessJsonLd` below closes the one remaining gap that round
 * flagged — location content pages, built this round (Phase 6,
 * `app/locations/[slug]/page.tsx`).
 */

import { absoluteUrl } from "@/lib/site/url";

function JsonLd({ data }: { data: object }) {
  // `.replace` guards against a `</script>` substring in any field value
  // (e.g. a product description) prematurely closing this script tag.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: absoluteUrl(item.url),
        })),
      }}
    />
  );
}

export function ProductJsonLd({
  id,
  name,
  description,
  brand,
  image,
  sku,
  offers,
}: {
  /** Optional `@id` so a second block (client-rendered offers) can refer to the same product. */
  id?: string;
  name: string;
  description: string;
  brand: string;
  image: string[];
  sku: string;
  /** Omit entirely when price/stock hasn't resolved yet (no zone) — never fabricate an offer. */
  offers?: { price: number; priceCurrency: string; availability: string; url: string };
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        ...(id ? { "@id": id } : {}),
        name,
        description,
        sku,
        brand: { "@type": "Brand", name: brand },
        image,
        ...(offers
          ? {
              offers: {
                "@type": "Offer",
                price: (offers.price / 100).toFixed(2),
                priceCurrency: offers.priceCurrency,
                availability: offers.availability,
                url: absoluteUrl(offers.url),
              },
            }
          : {}),
      }}
    />
  );
}

/**
 * `LocalBusiness` structured data for a location content page. Location
 * pages are primarily static authored copy, not a generated view of live
 * `ServiceZone` data (docs/architecture/01-data-model.md's Content section)
 * — `areaServed` reads from the linked `service_zone.name` when the page has
 * one, falling back to the page's own `title` (still descriptive of the
 * area, e.g. "Mobile Tyre Fitting in Richmond, VIC") for the pages that
 * don't link a zone at all (an unserviced-yet suburb's "coming soon" page,
 * per that same doc section). `@type: "LocalBusiness"` over the narrower
 * `Service` type — this frontend has one business (Tiro Mobile Tyres) with
 * many service areas, not a catalog of distinct services per page.
 */
export type OpeningHoursSpec = { dayOfWeek: string[]; opens: string; closes: string };

export function LocalBusinessJsonLd({
  name,
  areaServed,
  url,
  description,
  telephone,
  address,
  openingHours,
}: {
  name: string;
  areaServed: string;
  url: string;
  description?: string;
  telephone?: string;
  /** Locality and region only: there is no street address for a mobile service. */
  address?: { locality: string; region: string };
  openingHours?: OpeningHoursSpec[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name,
        areaServed,
        url: absoluteUrl(url),
        ...(description ? { description } : {}),
        ...(telephone ? { telephone } : {}),
        ...(address
          ? { address: { "@type": "PostalAddress", addressLocality: address.locality, addressRegion: address.region, addressCountry: "AU" } }
          : {}),
        ...(openingHours && openingHours.length > 0
          ? {
              openingHoursSpecification: openingHours.map((h) => ({
                "@type": "OpeningHoursSpecification",
                dayOfWeek: h.dayOfWeek,
                opens: h.opens,
                closes: h.closes,
              })),
            }
          : {}),
      }}
    />
  );
}

/**
 * `Organization` + optional nested `AggregateRating` — added Phase 8 for the
 * Reviews storefront UI (homepage widget, `/reviews`). Deliberately
 * `Organization`, not `LocalBusinessJsonLd` above: that helper is scoped to
 * per-location content pages (`areaServed` is location-specific), whereas
 * an aggregate rating is a site-wide figure with no single service area —
 * using it here would mean either fabricating an `areaServed` or reusing
 * one location's, both wrong. No per-review `Review` markup is emitted
 * anywhere (deliberately out of scope this round — see the completion
 * report) to stay inside the exact structured-data types the task brief
 * named (Product, LocalBusiness/Service, FAQPage, BreadcrumbList) rather
 * than reaching for one it didn't.
 */
export function OrganizationJsonLd({
  name,
  url,
  telephone,
  aggregateRating,
}: {
  name: string;
  url: string;
  telephone?: string;
  aggregateRating?: { ratingValue: number; reviewCount: number };
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name,
        url: absoluteUrl(url),
        ...(telephone ? { telephone } : {}),
        ...(aggregateRating
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: aggregateRating.ratingValue,
                reviewCount: aggregateRating.reviewCount,
              },
            }
          : {}),
      }}
    />
  );
}

/** `Service` for a /services/[slug] page, provided by the site's LocalBusiness. */
export function ServiceJsonLd({
  name,
  description,
  url,
  provider,
}: {
  name: string;
  description: string;
  url: string;
  provider: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Service",
        name,
        description,
        url: absoluteUrl(url),
        provider: { "@type": "LocalBusiness", name: provider },
        areaServed: "Australia",
      }}
    />
  );
}

export function FaqJsonLd({ items }: { items: { question: string; answer: string }[] }) {
  if (items.length === 0) return null; // an empty FAQPage is invalid markup
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }}
    />
  );
}

/**
 * Promotional `Offer` for an offer detail page. It carries the offer's real
 * window and seller; there is deliberately no `price` (an offer is a discount
 * rule, not a single priced product) and no rating.
 */
export function OfferJsonLd({
  name,
  description,
  url,
  validFrom,
  validThrough,
  seller,
}: {
  name: string;
  description?: string;
  url: string;
  validFrom?: string;
  validThrough?: string;
  seller: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Offer",
        name,
        ...(description ? { description } : {}),
        url: absoluteUrl(url),
        ...(validFrom ? { validFrom } : {}),
        ...(validThrough ? { validThrough } : {}),
        seller: { "@type": "Organization", name: seller },
      }}
    />
  );
}
