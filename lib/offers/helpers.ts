import { TYRE_CATEGORY_LABELS } from "@/lib/catalog/labels";
import type { TyreCategory } from "@/lib/catalog/types";
import type { Offer } from "./types";

/** An offer ending within this many days counts as "Ends soon". */
export const ENDS_SOON_DAYS = 14;

/** Whole days from `now` to the end date (inclusive of the end date itself). Negative once ended. */
export function daysLeft(endsAt: string, now: Date = new Date()): number {
  const end = Date.parse(`${endsAt.slice(0, 10)}T00:00:00Z`);
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(end)) return Number.POSITIVE_INFINITY;
  return Math.round((end - today) / 86_400_000);
}

export function isEndingSoon(offer: Pick<Offer, "ends_at">, now?: Date): boolean {
  const left = daysLeft(offer.ends_at, now);
  return left >= 0 && left <= ENDS_SOON_DAYS;
}

/** "Ends 30 Dec", or "Ends 1 Jan 2027" when the end date is not in the current year (date only, no timezone shifting: the API sends a plain date). */
export function formatOfferEnd(endsAt: string): string {
  const d = new Date(`${endsAt.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "Ends soon";
  const otherYear = d.getUTCFullYear() !== new Date().getUTCFullYear();
  return `Ends ${d.toLocaleDateString("en-AU", { day: "numeric", month: "short", ...(otherYear ? { year: "numeric" } : {}), timeZone: "UTC" })}`;
}

export function formatOfferDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * The offer's feature image URL, or `null` when there is none. The admin media
 * picker stores the uploaded file's absolute URL in `promotions.image_path`; a
 * bare storage-relative value has no host the storefront can resolve, so it
 * counts as "no image" and the card keeps its text layout.
 */
export function offerImageSrc(offer: Pick<Offer, "image_path">): string | null {
  const value = offer.image_path?.trim();
  if (!value) return null;
  return /^https?:\/\//i.test(value) || value.startsWith("/") ? value : null;
}

/**
 * "Shop this offer" target. The offer's `shop_filters` go straight onto the
 * storefront listing; an empty object means the plain listing. Unknown keys
 * are ignored so a future API key cannot leak into the URL unreviewed.
 */
export function offerShopHref(offer: Pick<Offer, "shop_filters">): string {
  const params = new URLSearchParams();
  if (offer.shop_filters.brand) params.set("brand", offer.shop_filters.brand);
  if (offer.shop_filters.category) params.set("category", offer.shop_filters.category);
  const qs = params.toString();
  return qs ? `/tyres?${qs}` : "/tyres";
}

/** The "Type" filter facet: the vehicle category the offer is scoped to, else all tyres. */
export function offerTypeKey(offer: Pick<Offer, "shop_filters">): string {
  return offer.shop_filters.category ?? "all";
}

export function offerTypeLabel(key: string): string {
  if (key === "all") return "All tyres";
  return TYRE_CATEGORY_LABELS[key as TyreCategory] ?? key;
}

/** Sorted by end date, soonest first (the API already does this; kept so stub and live agree). */
export function sortByEnd<T extends Pick<Offer, "ends_at">>(offers: T[]): T[] {
  return [...offers].sort((a, b) => a.ends_at.localeCompare(b.ends_at));
}
