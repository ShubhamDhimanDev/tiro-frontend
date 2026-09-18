import Link from "next/link";
import { formatMoney } from "@/lib/catalog/format-money";
import type { TyreModelGroup } from "@/lib/catalog/group-by-model";
import { StockBadge } from "@/components/catalog/stock-badge";

/**
 * "From $X" card — one per `tyre_model`, grouped client-side from the
 * flat `TyreVariant`-level search response (see `lib/catalog/group-by-model.ts`).
 * Links to the first matching variant's PDP (one-URL-per-size routing,
 * docs/architecture/06-open-decisions.md item 6).
 */
export function TyreModelCard({ group }: { group: TyreModelGroup }) {
  const { model, variants, fromPrice } = group;
  const primary = variants[0];
  const image = model.images[0] ?? "/tyres/placeholder-tyre.svg";

  return (
    <Link
      href={`/tyres/${primary.slug}`}
      className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- image host isn't known/configured yet, see completion report */}
      <img src={image} alt={`${model.brand.name} ${model.name}`} className="aspect-square w-full rounded-md object-cover" />
      <div>
        <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{model.brand.name}</p>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{model.name}</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {primary.width}/{primary.profile} R{primary.rim_diameter}
          {variants.length > 1 ? ` +${variants.length - 1} more size${variants.length > 2 ? "s" : ""}` : ""}
        </p>
      </div>
      {fromPrice !== undefined ? (
        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">From {formatMoney(fromPrice)}</p>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Set your location to see pricing</p>
      )}
      {primary.stock_status && <StockBadge status={primary.stock_status} />}
    </Link>
  );
}
