import Link from "next/link";
import type { PopularSize } from "@/lib/catalog/types";

/**
 * Admin-curated shortcut list — `GET /api/v1/tyres/popular-sizes`
 * (requirements §3.2). Deep-links into `/tyres?width=&profile=&rim_diameter=`,
 * not its own product listing.
 */
export function PopularSizes({ sizes }: { sizes: PopularSize[] }) {
  if (sizes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {sizes.map((size) => (
        <Link
          key={`${size.width}-${size.profile}-${size.rim_diameter}`}
          href={`/tyres?width=${size.width}&profile=${size.profile}&rim_diameter=${size.rim_diameter}`}
          className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {size.width}/{size.profile} R{size.rim_diameter}
        </Link>
      ))}
    </div>
  );
}
