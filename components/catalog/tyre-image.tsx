"use client";

import Image from "next/image";
import { useState } from "react";
import { cx } from "@/components/ui/cx";

export const PLACEHOLDER_TYRE_IMAGE = "/tyres/placeholder-tyre.svg";

/**
 * Tyre photo with a reserved aspect ratio (no layout shift) and a fallback to
 * the placeholder SVG if the source is missing or fails to load.
 *
 * `unoptimized`: the image host for real tyre photos isn't configured yet
 * (`images.remotePatterns` in next.config.ts), so the optimizer can't be used
 * for them; this keeps `next/image`'s sizing/lazy/priority behaviour without a
 * host allow-list. Revisit when the host is known.
 */
export function TyreImage({
  src,
  alt,
  sizes,
  priority = false,
  className,
  ratioClassName = "aspect-square",
}: {
  src: string | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  ratioClassName?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const wanted = src || PLACEHOLDER_TYRE_IMAGE;
  const effective = failedSrc === wanted ? PLACEHOLDER_TYRE_IMAGE : wanted;

  return (
    <div className={cx("relative overflow-hidden bg-chip", ratioClassName, className)}>
      <Image
        src={effective}
        alt={alt}
        fill
        unoptimized
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className="object-contain p-1"
        onError={() => setFailedSrc(wanted)}
      />
    </div>
  );
}
