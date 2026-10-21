/**
 * Shared star-rating glyph row — text-based (★/☆) rather than an icon
 * library: no icon dependency exists anywhere in this project yet
 * (`package.json` has none), so this avoids introducing one for five
 * characters. Purely presentational; the numeric rating itself is always
 * rendered as text alongside this by every caller, so this is
 * `aria-hidden` and never the only way the rating is conveyed.
 *
 * brand yellow stars on white/black surfaces.
 */
export function ReviewStars({ rating, className }: { rating: number; className?: string }) {
  const rounded = Math.round(rating);
  return (
    <span aria-hidden="true" className={`tracking-tight text-gold ${className ?? ""}`}>
      {"★".repeat(Math.max(0, Math.min(5, rounded)))}
      <span className="text-line">{"★".repeat(Math.max(0, 5 - rounded))}</span>
    </span>
  );
}
