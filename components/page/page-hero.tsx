import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/content/breadcrumbs";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { cx } from "@/components/ui/cx";

/** Inline yellow marker for one or two words of a hero H1. */
export function Mark({ children }: { children: ReactNode }) {
  return <span className="brand-highlight">{children}</span>;
}

/**
 * Standard hero band for content pages (design v2): breadcrumb, one H1, an
 * optional lead and actions, optional right-hand aside (desktop) and a yellow
 * chevron accent. `tone="black"` is the default; `tone="yellow"` is used for
 * lighter info pages. Emits the BreadcrumbList JSON-LD from the same `crumbs`
 * it renders, so markup and structured data cannot drift apart.
 *
 * Pass `children` for anything that belongs inside the band under the lead
 * (a finder, a check form). Keep the H1 to one line of meaning.
 */
export function PageHero({
  title,
  crumbs,
  lead,
  eyebrow,
  tone = "black",
  actions,
  aside,
  children,
  titleId,
  className,
}: {
  title: ReactNode;
  crumbs: { name: string; url: string }[];
  lead?: ReactNode;
  eyebrow?: string;
  tone?: "black" | "yellow";
  actions?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  titleId?: string;
  className?: string;
}) {
  const black = tone === "black";
  return (
    <section
      aria-labelledby={titleId ?? "page-title"}
      className={cx("relative overflow-hidden", black ? "bg-ink text-white" : "bg-gold text-black", className)}
    >
      <BreadcrumbJsonLd items={crumbs} />
      {black && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] overflow-hidden md:block">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="absolute top-[-10%] h-[120%] -skew-x-[18deg] bg-gold"
              style={{ left: `${40 + i * 20}%`, width: `${12 - i * 3}%`, opacity: 1 - i * 0.25 }}
            />
          ))}
        </div>
      )}
      <div
        className={cx(
          "container-page relative grid gap-6 py-6 md:py-12",
          aside ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-12" : "",
        )}
      >
        <div className="flex min-w-0 flex-col gap-3 md:gap-4">
          <Breadcrumbs items={crumbs} tone={black ? "dark" : "gold"} />
          {eyebrow && <p className={cx("type-eyebrow font-bold uppercase", black ? "text-gold" : "text-black")}>{eyebrow}</p>}
          <h1 id={titleId ?? "page-title"} className="type-display max-w-3xl text-balance lg:!text-[clamp(40px,4.2vw,52px)]">
            {title}
          </h1>
          {lead && <div className={cx("max-w-2xl text-base md:text-lg", black ? "text-white/85" : "text-black/80")}>{lead}</div>}
          {actions && <div className="flex flex-wrap gap-3 pt-1">{actions}</div>}
          {children}
        </div>
        {aside && <div className="relative z-10 min-w-0">{aside}</div>}
      </div>
    </section>
  );
}
