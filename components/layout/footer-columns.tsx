"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cx } from "@/components/ui/cx";

export type FooterColumn = { heading: string; body: ReactNode; /** Wider column on desktop (the About blurb). */ wide?: boolean };

/**
 * Footer columns. Below 768px each column is an accordion (button +
 * collapsible body); from 768px every column is open under a plain yellow
 * heading. The closed state is CSS-only (`hidden md:block`), so the content is
 * in the server HTML and the desktop layout never depends on JS.
 */
export function FooterColumns({ columns }: { columns: FooterColumn[] }) {
  const baseId = useId();
  const [openHeading, setOpenHeading] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-0 md:grid-cols-2 md:gap-y-8 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
      {columns.map((col) => {
        const open = openHeading === col.heading;
        const bodyId = `${baseId}-${col.heading.replace(/\W+/g, "-")}`;
        return (
          <div key={col.heading} className="border-b border-white/15 md:border-0">
            <h2 className="hidden text-lg font-semibold text-gold md:block">{col.heading}</h2>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => setOpenHeading(open ? null : col.heading)}
              className="flex min-h-14 w-full items-center justify-between text-left text-lg font-semibold text-gold md:hidden"
            >
              {col.heading}
              <ChevronDownIcon className={cx("h-5 w-5 transition-transform duration-300", open && "rotate-180")} />
            </button>
            <div id={bodyId} className={cx("pb-4 md:mt-3 md:block md:pb-0", open ? "block" : "hidden")}>
              {col.body}
            </div>
          </div>
        );
      })}
    </div>
  );
}
