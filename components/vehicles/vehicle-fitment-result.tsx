import Link from "next/link";
import { buildTyreSearchQuery } from "@/lib/catalog/search-params";
import { primaryButtonClassName } from "@/components/ui/form-field";
import { hasNoFitmentData } from "@/lib/vehicles/types";
import type { VehicleFitmentAll, VehicleFitmentData, VehicleFitmentFrontRear, VehicleFitmentSize } from "@/lib/vehicles/types";

function sizeLabel(size: VehicleFitmentSize): string {
  return `${size.width}/${size.profile} R${size.rim_diameter}`;
}

function FitmentSizeCard({ label, size }: { label: string; size: VehicleFitmentSize }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
      <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{sizeLabel(size)}</span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        Load index {size.load_index} &middot; Speed rating {size.speed_rating}
      </span>
      {size.confidence !== "confirmed" && (
        <span className="text-xs text-amber-600 dark:text-amber-400">Fitment confidence: {size.confidence}</span>
      )}
    </div>
  );
}

function vehicleLabel(vehicle: VehicleFitmentData["vehicle"]): string {
  return [
    vehicle.make,
    vehicle.model,
    vehicle.series,
    vehicle.year_to ? `${vehicle.year_from}–${vehicle.year_to}` : `${vehicle.year_from}–Present`,
    vehicle.body_type,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * The 4-step cascade's terminal state — mirrors `/api/v1/tyres`'s
 * staggered/non-staggered visual convention (task brief) so this and the
 * `/tyres` search results page (`<TyreSearchResults>` /
 * `<TyreSearchResultsStaggered>`) feel like the same product: one size
 * block for a non-staggered fitment, two side-by-side Front/Rear blocks for
 * a staggered one.
 *
 * The zero-fitment case (`fitments: {}`, a data-entry gap per the contract,
 * not an error) gets its own explanatory state per requirements §3.1's
 * "clearly explain when no products are available" posture, applied here to
 * fitment data rather than search results — linking back to the manual
 * size-search entry point (`/tyres`) rather than dead-ending.
 *
 * The "Shop tyres for this fitment" links build their `/tyres` query via
 * `buildTyreSearchQuery` (`lib/catalog/search-params.ts`) — the same
 * utility the staggered/non-staggered search pagination already uses —
 * rather than a second hand-rolled param-construction path. No `zone` is
 * ever passed here: `/tyres` resolves the zone itself server-side from the
 * cookie (see `app/tyres/page.tsx`), and no `page`/`front_page`/`rear_page`
 * is set beyond the utility's own default of `1` — a fresh handoff always
 * starts both sides at page 1.
 */
export function VehicleFitmentResult({ result }: { result: VehicleFitmentData }) {
  const { vehicle, is_staggered, fitments } = result;
  const label = vehicleLabel(vehicle);

  if (hasNoFitmentData(fitments)) {
    return (
      <div className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        <p>
          <strong>{label}</strong> &mdash; we don&apos;t have confirmed fitment data for this vehicle yet.
        </p>
        <p>
          Try searching by tyre size instead &mdash; check your existing tyre&apos;s sidewall for the width/profile/rim
          numbers.
        </p>
        <Link
          href="/tyres"
          className="w-fit rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-50 dark:border-amber-800 dark:bg-zinc-900 dark:text-amber-200"
        >
          Search by tyre size
        </Link>
      </div>
    );
  }

  if (is_staggered) {
    const { front, rear } = fitments as VehicleFitmentFrontRear;
    const href = `/tyres?${buildTyreSearchQuery({
      staggered: "true",
      front_width: String(front.width),
      front_profile: String(front.profile),
      front_rim_diameter: String(front.rim_diameter),
      rear_width: String(rear.width),
      rear_profile: String(rear.profile),
      rear_rim_diameter: String(rear.rim_diameter),
    }).toString()}`;

    return (
      <div className="flex flex-col gap-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Confirmed fitment for <strong className="text-zinc-900 dark:text-zinc-100">{label}</strong> (staggered
          &mdash; front and rear differ)
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FitmentSizeCard label="Front" size={front} />
          <FitmentSizeCard label="Rear" size={rear} />
        </div>
        <Link href={href} className={`${primaryButtonClassName} sm:w-auto`}>
          Shop tyres for this fitment
        </Link>
      </div>
    );
  }

  const { all } = fitments as VehicleFitmentAll;
  const href = `/tyres?${buildTyreSearchQuery({
    width: String(all.width),
    profile: String(all.profile),
    rim_diameter: String(all.rim_diameter),
  }).toString()}`;

  return (
    <div className="flex flex-col gap-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Confirmed fitment for <strong className="text-zinc-900 dark:text-zinc-100">{label}</strong>
      </p>
      <FitmentSizeCard label="All four tyres" size={all} />
      <Link href={href} className={`${primaryButtonClassName} sm:w-auto`}>
        Shop tyres for this fitment
      </Link>
    </div>
  );
}
