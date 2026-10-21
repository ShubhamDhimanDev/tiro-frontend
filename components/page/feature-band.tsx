import Link from "next/link";
import type { ReactNode } from "react";
import { hasImage, ImageSlot } from "@/components/page/image-slot";
import { buttonClassName } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import type { ContentImageKey } from "@/lib/site/content-images";

/**
 * One full-width alternating band: heading (with a small icon tile beside it),
 * short text, a link and an image. Stack several (`tone` alternates
 * white/grey, `flip` swaps sides on desktop) for hub pages such as Offers and
 * Mobile services. On phones the order is always text first, then image.
 *
 * A slot with no real photo yet renders nothing (no placeholder stripe): the
 * band becomes a single text column. It picks up the photo automatically once
 * `src` is set in `lib/site/content-images.ts`.
 */
export function FeatureBand({
  id,
  title,
  children,
  href,
  cta,
  ctaLabel,
  icon,
  image,
  imageIcon,
  tone = "white",
  flip = false,
  imageClassName,
}: {
  id: string;
  title: string;
  children: ReactNode;
  href?: string;
  cta?: string;
  /** Accessible name when the visible CTA text is short (e.g. "Learn more"). */
  ctaLabel?: string;
  icon?: ReactNode;
  image: ContentImageKey;
  imageIcon?: ReactNode;
  tone?: "white" | "grey";
  flip?: boolean;
  imageClassName?: string;
}) {
  const showImage = hasImage(image);
  return (
    <section aria-labelledby={`${id}-heading`} id={id} className={cx("scroll-mt-24", tone === "grey" ? "bg-band" : "bg-surface")}>
      <div className={cx("container-page grid gap-6 py-10 lg:items-center lg:gap-16 lg:py-12", showImage && "lg:grid-cols-2")}>
        <div className={cx("flex min-w-0 flex-col items-start gap-4", flip && showImage && "lg:order-2")}>
          <div className="flex items-center gap-3">
            {icon && (
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-gold text-black [&_svg]:h-6 [&_svg]:w-6"
              >
                {icon}
              </span>
            )}
            <h2 id={`${id}-heading`} className="type-h2">
              {title}
            </h2>
          </div>
          <div className="flex max-w-xl flex-col gap-3 text-base text-muted lg:text-lg">{children}</div>
          {href && cta && (
            <div className="pt-1">
              <Link href={href} aria-label={ctaLabel} className={buttonClassName({ variant: "black", size: "md" })}>
                {cta}
              </Link>
            </div>
          )}
        </div>
        {showImage && <ImageSlot slot={image} icon={imageIcon} className={cx("mx-auto max-w-[560px]", imageClassName)} />}
      </div>
    </section>
  );
}
