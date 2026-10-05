"use client";

import { useMemo, useState } from "react";
import { ChipButton } from "@/components/ui/chip";
import { ScrollRow } from "@/components/ui/scroll-row";
import { Button } from "@/components/ui/button";
import { ContentSummaryCard } from "@/components/content/content-summary-card";
import { categoryLabel } from "@/lib/content/prose";
import type { ContentPageSummary } from "@/lib/content/types";

export const CONTENT_PAGE_SIZE = 9;

/**
 * Blog / guides index body. The page itself stays static (ISR): the server
 * component fetches the full published list once, and this component does the
 * category filtering and "Show more" client-side, so neither needs a
 * `searchParams` read (which would make the route dynamic).
 *
 * With `featured`, the newest post is a large card above the grid (only while
 * viewing All, first load); it is not repeated in the grid.
 */
export function ContentExplorer({
  items,
  basePath,
  noun,
  featured = false,
  pageSize = CONTENT_PAGE_SIZE,
}: {
  items: ContentPageSummary[];
  basePath: string;
  /** Plural noun for the count and button, e.g. "posts". */
  noun: string;
  featured?: boolean;
  pageSize?: number;
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [shown, setShown] = useState(pageSize);

  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const item of items) if (item.category && !seen.includes(item.category)) seen.push(item.category);
    return seen;
  }, [items]);

  const filtered = category ? items.filter((i) => i.category === category) : items;
  const lead = featured && !category ? filtered[0] : undefined;
  const rest = lead ? filtered.slice(1) : filtered;
  const visible = rest.slice(0, shown);
  const remaining = rest.length - visible.length;

  function choose(next: string | null) {
    setCategory(next);
    setShown(pageSize);
  }

  return (
    <div className="flex flex-col gap-8">
      {categories.length > 0 && (
        <ScrollRow>
          <div role="group" aria-label="Filter by category" className="flex gap-2">
            <ChipButton selected={category === null} onClick={() => choose(null)}>
              All
            </ChipButton>
            {categories.map((c) => (
              <ChipButton key={c} selected={category === c} onClick={() => choose(c)} className="capitalize">
                {categoryLabel(c)}
              </ChipButton>
            ))}
          </div>
        </ScrollRow>
      )}

      <p aria-live="polite" className="type-small -mt-4 text-muted">
        {filtered.length} {filtered.length === 1 ? noun.replace(/s$/, "") : noun}
        {category ? ` in ${categoryLabel(category)}` : ""}
      </p>

      {lead && <ContentSummaryCard item={lead} href={`${basePath}/${lead.slug}`} featured />}

      {visible.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {visible.map((item) => (
            <li key={item.slug}>
              <ContentSummaryCard item={item} href={`${basePath}/${item.slug}`} />
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => setShown((n) => n + pageSize)}>
            Show more {noun} ({remaining} left)
          </Button>
        </div>
      )}
    </div>
  );
}
