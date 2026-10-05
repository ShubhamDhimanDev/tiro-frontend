"use client";

import { usePdpBuy } from "@/components/catalog/pdp-buy-context";
import { ProductJsonLd } from "@/components/seo/json-ld";
import type { StockStatus } from "@/lib/catalog/types";

const AVAILABILITY: Record<Exclude<StockStatus, "unavailable_in_zone">, string> = {
  in_stock: "https://schema.org/InStock",
  limited: "https://schema.org/LimitedAvailability",
  out_of_stock: "https://schema.org/OutOfStock",
};

/**
 * Product `offers` (price, currency, availability) once a location is known.
 *
 * The cached PDP has no price by design (price is per zone and changes), so the
 * server-rendered Product JSON-LD carries none. When the live availability
 * fetch resolves this adds a second Product block with the same `@id` plus the
 * offer, for crawlers that execute JavaScript. Nothing is emitted for
 * `unavailable_in_zone` or before a price exists: an offer is never invented.
 * Phase 8 (SEO) can move this server-side if a default-zone price is agreed.
 */
export function PdpOfferJsonLd(props: {
  id: string;
  name: string;
  description: string;
  brand: string;
  image: string[];
  sku: string;
  url: string;
}) {
  const { availability, unitCents } = usePdpBuy();
  if (availability.status !== "ready" || unitCents === null || availability.data.stock_status === "unavailable_in_zone") {
    return null;
  }
  return (
    <ProductJsonLd
      {...props}
      offers={{
        price: unitCents,
        priceCurrency: availability.data.currency || "AUD",
        availability: AVAILABILITY[availability.data.stock_status],
        url: props.url,
      }}
    />
  );
}
