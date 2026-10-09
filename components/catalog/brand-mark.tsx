"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { brandLogoSrc } from "@/lib/catalog/brand-logo";

/**
 * A brand's uploaded logo on a white tile (official artwork is never
 * recoloured, so it needs a neutral ground on the yellow band and grey hero).
 * Renders `children` instead when the brand has no usable logo or the image
 * fails to load, so callers keep their existing typeset-name / initials look.
 *
 * Plain `<img>`, not `next/image`: logos come from the Laravel storage host,
 * which is not in `images.remotePatterns`, and they are tiny. The tile's size
 * comes from `className`, so there is no layout shift either way.
 */
export function BrandMark({
  logoPath,
  name,
  decorative = false,
  className,
  children,
}: {
  logoPath: string | null | undefined;
  name: string;
  /** True for aria-hidden duplicates (the marquee's loop copy). */
  decorative?: boolean;
  /** Sizes the tile, e.g. `h-14 w-32`. */
  className?: string;
  /** Shown when there is no logo or it fails to load. */
  children?: ReactNode;
}) {
  const src = brandLogoSrc(logoPath);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return <>{children}</>;

  return (
    <span className={cx("flex shrink-0 items-center justify-center rounded-control bg-white p-1.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote logo host is not configured for next/image; see doc comment */}
      <img
        src={src}
        alt={decorative ? "" : name}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrc(src)}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
