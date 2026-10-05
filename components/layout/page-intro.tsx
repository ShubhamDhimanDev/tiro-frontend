import type { ReactNode } from "react";

/** Compact page heading block shared by the lightweight marketing pages. */
export function PageIntro({ eyebrow, title, lead, children }: { eyebrow?: string; title: string; lead?: string; children?: ReactNode }) {
  return (
    <section className="border-b border-line bg-chip">
      <div className="container-page flex max-w-4xl flex-col gap-3 py-10 md:py-14">
        {eyebrow && <p className="type-eyebrow font-bold text-link">{eyebrow}</p>}
        <h1 className="type-display text-4xl md:text-6xl">{title}</h1>
        {lead && <p className="max-w-2xl text-lg text-muted">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
