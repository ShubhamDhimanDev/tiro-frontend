/**
 * "Request a quote" link used by empty and error states. It opens the Get a
 * quote tab on /contact with the size prefilled (`205/55R16`). Only a tyre size
 * goes in the URL, never anything personal.
 */
export function formatQuoteSize(width?: string, profile?: string, rim?: string): string | null {
  if (!width || !profile || !rim) return null;
  if (!/^\d{3}$/.test(width) || !/^\d{2,3}$/.test(profile) || !/^\d{2}$/.test(rim)) return null;
  return `${width}/${profile}R${rim}`;
}

export function quoteHref(size?: string | null): string {
  const params = new URLSearchParams({ type: "quote" });
  if (size) params.set("size", size);
  return `/contact?${params.toString()}`;
}

/** Quote link for a search: prefills the size for a plain search, or the given side of a staggered one. */
export function quoteHrefForValues(input: object | undefined, side?: "front" | "rear"): string {
  if (!input) return quoteHref();
  const values = input as Record<string, string | undefined>;
  const size =
    side === "front"
      ? formatQuoteSize(values.front_width, values.front_profile, values.front_rim_diameter)
      : side === "rear"
        ? formatQuoteSize(values.rear_width, values.rear_profile, values.rear_rim_diameter)
        : formatQuoteSize(values.width, values.profile, values.rim_diameter);
  return quoteHref(size);
}
