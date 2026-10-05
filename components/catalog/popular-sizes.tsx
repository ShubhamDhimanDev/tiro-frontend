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
    <ul className="flex flex-wrap gap-2">
      {sizes.map((size) => (
        <li key={`${size.width}-${size.profile}-${size.rim_diameter}`}>
          <Link
            href={`/tyres?width=${size.width}&profile=${size.profile}&rim_diameter=${size.rim_diameter}`}
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 font-mono text-sm font-medium text-ink transition-colors hover:bg-chip"
          >
            {size.width}/{size.profile} R{size.rim_diameter}
          </Link>
        </li>
      ))}
    </ul>
  );
}
