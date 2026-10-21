import type { ReactNode } from "react";
import Image from "next/image";
import { Breadcrumbs } from "@/components/content/breadcrumbs";
import { HeroArt } from "@/components/layout/hero-art";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { cx } from "@/components/ui/cx";

export type PageHeroImage = { src: string; alt?: string };

/**
 * Shared landing-page hero (same look as the home hero): h1, optional intro,
 * optional breadcrumbs and a children slot (finder card, check form) on the
 * left; on the right a fixed-aspect `next/image` (`priority`, it is the LCP
 * element) or, while no photograph exists, the yellow chevron-bars + van
 * fallback. The image is decorative (`alt=""`) unless `image.alt` is given.
 * Server component; renders exactly one h1. Distinct from the black
 * content-page band in `components/page/page-hero.tsx`.
 */
export function PageHero({
  title,
  intro,
  children,
  image,
  crumbs,
  eyebrow,
  actions,
  titleId = "page-hero-title",
  className,
}: {
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  image?: PageHeroImage | null;
  crumbs?: { name: string; url: string }[];
  eyebrow?: string;
  actions?: ReactNode;
  titleId?: string;
  className?: string;
}) {
  return (
    <section aria-labelledby={titleId} className={cx("relative overflow-hidden bg-surface", className)}>
      {crumbs && <BreadcrumbJsonLd items={crumbs} />}
      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-8 py-8 md:py-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-6 lg:py-16">
        <div className="relative z-10 flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-3">
            {crumbs && <Breadcrumbs items={crumbs} />}
            {eyebrow && <p className="type-eyebrow font-bold uppercase text-black">{eyebrow}</p>}
            <h1 id={titleId} className="type-display max-w-3xl text-balance lg:!text-[clamp(40px,4.2vw,52px)]">
              {title}
            </h1>
            {intro && <div className="max-w-xl text-lg text-muted">{intro}</div>}
            {actions && <div className="flex flex-wrap gap-3 pt-1">{actions}</div>}
          </div>
          {children}
        </div>
        {image ? (
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-card lg:self-center">
            <Image src={image.src} alt={image.alt ?? ""} fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
          </div>
        ) : (
          <HeroArt />
        )}
      </div>
    </section>
  );
}
