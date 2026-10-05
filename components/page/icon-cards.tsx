import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

/** Responsive grid of small cards: yellow icon circle, bold title, short text. */
export function IconCards({
  items,
  columns = 3,
  className,
}: {
  items: { icon: ReactNode; title: string; body?: ReactNode }[];
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const cols = columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <ul className={cx("grid gap-4", cols, className)}>
      {items.map((item) => (
        <li key={item.title} className="flex gap-4 rounded-card border border-line bg-surface p-5 shadow-rest">
          <span
            aria-hidden="true"
            className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-gold text-black [&_svg]:h-6 [&_svg]:w-6"
          >
            {item.icon}
          </span>
          <div className="min-w-0">
            <h3 className="type-h3">{item.title}</h3>
            {item.body && <p className="mt-1 text-[15px] text-muted">{item.body}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
