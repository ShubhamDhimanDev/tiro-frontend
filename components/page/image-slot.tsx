import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { CONTENT_IMAGES, type ContentImageKey } from "@/lib/site/content-images";

/**
 * A demo/placeholder image that holds its place. Looks up `slot` in
 * `lib/site/content-images.ts`; while `src` is null it draws a token-based
 * placeholder (dark tread texture, yellow chevron bars, optional glyph) at the
 * slot's aspect ratio, so the layout is final before the photo exists. Once the
 * file is added and `src` is set, the same component renders the real `<img>`.
 *
 * MOCK: the placeholder is decorative (`aria-hidden`) and carries
 * `data-image-slot="<file path>"` so a review can see which file goes where.
 * Slots are listed in docs/prompts/IMAGE-MANIFEST.md.
 */
/** True once a real photo file has been wired up for this slot. */
export function hasImage(slot: ContentImageKey): boolean {
  return Boolean(CONTENT_IMAGES[slot].src);
}

export function ImageSlot({
  slot,
  icon,
  className,
  rounded = true,
  fit = "cover",
  hideOnMobile = false,
  eager = false,
}: {
  slot: ContentImageKey;
  /** Glyph drawn in the placeholder. */
  icon?: ReactNode;
  className?: string;
  rounded?: boolean;
  fit?: "cover" | "contain";
  /** Hide the placeholder (not a real photo) below md. */
  hideOnMobile?: boolean;
  /** Load now instead of lazily: for an image that is the main thing on the first screen (the LCP element). */
  eager?: boolean;
}) {
  const image = CONTENT_IMAGES[slot];
  const shape = rounded ? "rounded-card" : "";
  if (image.src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- static generated asset with known dimensions
      <img
        src={image.src}
        width={image.width}
        height={image.height}
        alt={image.alt}
        loading={eager ? "eager" : "lazy"}
        className={cx("h-auto w-full", fit === "cover" ? "object-cover" : "object-contain", shape, className)}
        style={{ aspectRatio: `${image.width} / ${image.height}` }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      data-image-slot={image.file}
      className={cx("asphalt-texture relative w-full overflow-hidden", hideOnMobile && "hidden md:block", shape, className)}
      style={{ aspectRatio: `${image.width} / ${image.height}` }}
    >
      {[0, 1].map((i) => (
        <span
          key={i}
          className="absolute top-[-10%] h-[120%] -skew-x-[18deg] bg-gold opacity-90"
          style={{ left: `${-4 + i * 11}%`, width: `${8 - i * 3}%` }}
        />
      ))}
      {icon && <span className="absolute inset-0 flex items-center justify-center text-white [&_svg]:h-1/4 [&_svg]:max-h-24 [&_svg]:w-1/4 [&_svg]:max-w-24">{icon}</span>}
    </div>
  );
}
