/**
 * The image URL to show for a brand, or `null` when there is nothing usable.
 *
 * The admin media picker stores the uploaded file's absolute URL in
 * `brands.logo_path`, so an `http(s)://` value can be used as-is. A bare
 * storage-relative value (e.g. `brands/x.png`) has no host the storefront can
 * resolve, so it is treated as "no logo" and the caller falls back to text.
 */
export function brandLogoSrc(logoPath: string | null | undefined): string | null {
  const value = logoPath?.trim();
  if (!value) return null;
  return /^https?:\/\//i.test(value) || value.startsWith("/") ? value : null;
}
