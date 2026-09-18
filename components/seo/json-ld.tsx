/**
 * Structured data helpers. "Structured data (Product, LocalBusiness/Service
 * per location page, FAQPage, BreadcrumbList) is part of 'done' for any
 * indexable page, not an afterthought" (task brief). This build covers
 * Product + FAQPage + BreadcrumbList (PDP, browse pages) — LocalBusiness/
 * Service is for location content pages (state/city/suburb), which are out
 * of scope this round (only the serviceability *capture* flow was in
 * scope, not full location landing pages) — flagged in the completion
 * report as a follow-up item, not silently dropped.
 */

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
          item: item.url,
        })),
      }}
    />
  );
}

export function ProductJsonLd({
  name,
  description,
  brand,
  image,
  sku,
  offers,
}: {
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
                url: offers.url,
              },
            }
          : {}),
      }}
    />
  );
}

export function FaqJsonLd({ items }: { items: { question: string; answer: string }[] }) {
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
