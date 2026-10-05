import Link from "next/link";
import type { ContentPageDetail } from "@/lib/content/types";
import { withHeadingIds } from "@/lib/content/prose";
import { CtaBands } from "@/components/page/cta-bands";
import { PageHero } from "@/components/page/page-hero";
import { Prose } from "@/components/content/prose";
import { buttonClassName } from "@/components/ui/button";

/**
 * Block-based template for generic pages and promotion landings: the standard
 * black hero band (breadcrumb, H1, excerpt, CTA to the tyre finder; it also
 * emits the BreadcrumbList JSON-LD), optional blocks between hero and body
 * (promo details), the prose body in a readable column, and the closing CTA
 * stack. Location pages compose their own blocks (see
 * app/locations/[slug]/page.tsx) but share `Prose`.
 */
export function ContentLanding({
  page,
  crumbs,
  eyebrow,
  blocks,
  children,
}: {
  page: ContentPageDetail;
  crumbs: { name: string; url: string }[];
  eyebrow?: string;
  /** Rendered between the hero and the body. */
  blocks?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { html } = withHeadingIds(page.body);

  return (
    <div>
      <PageHero
        crumbs={crumbs}
        eyebrow={eyebrow}
        title={page.title}
        lead={page.excerpt ?? undefined}
        actions={
          <Link href="/tyres" className={buttonClassName({ variant: "green" })}>
            Find your tyres
          </Link>
        }
      />

      <div className="container-page flex flex-col gap-8 py-10 md:py-14">
        {blocks && <div className="mx-auto w-full max-w-[68ch]">{blocks}</div>}
        <div className="mx-auto w-full max-w-[68ch]">
          <Prose html={html} />
        </div>
        {children}
      </div>
      <CtaBands />
    </div>
  );
}
