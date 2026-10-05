"use client";

import { useState } from "react";
import { ChipButton } from "@/components/ui/chip";
import { ScrollRow } from "@/components/ui/scroll-row";
import { Accordion } from "@/components/ui/accordion";

export type FaqGroup = { category: string; items: { id: number; question: string; answer: string }[] };

/**
 * FAQ page body: category chips (All + one per category) over an accessible
 * accordion per category. The FAQPage JSON-LD is rendered by the server page
 * from the full list, unchanged by which chip is active.
 */
export function FaqExplorer({ groups }: { groups: FaqGroup[] }) {
  const [active, setActive] = useState<string | null>(null);
  const visible = active ? groups.filter((g) => g.category === active) : groups;

  return (
    <div className="flex flex-col gap-8">
      {groups.length > 1 && (
        <ScrollRow>
          <div role="group" aria-label="Filter by topic" className="flex gap-2">
            <ChipButton selected={active === null} onClick={() => setActive(null)}>
              All
            </ChipButton>
            {groups.map((g) => (
              <ChipButton key={g.category} selected={active === g.category} onClick={() => setActive(g.category)} className="capitalize">
                {g.category.replace(/-/g, " ")}
              </ChipButton>
            ))}
          </div>
        </ScrollRow>
      )}

      {visible.map((group) => (
        <section key={group.category} className="flex flex-col gap-4">
          <h2 className="type-h3 capitalize">{group.category.replace(/-/g, " ")}</h2>
          <Accordion items={group.items.map((i) => ({ id: i.id, title: i.question, content: i.answer }))} />
        </section>
      ))}
    </div>
  );
}
