import Link from "next/link";
import { buildTyreSearchQuery } from "@/lib/catalog/search-params";
import { buttonClassName } from "@/components/ui/button";
import { hasNoFitmentData } from "@/lib/vehicles/types";
import type { VehicleFitmentAll, VehicleFitmentData, VehicleFitmentFrontRear, VehicleFitmentSize } from "@/lib/vehicles/types";

function sizeLabel(size: VehicleFitmentSize): string {
  return `${size.width}/${size.profile} R${size.rim_diameter}`;
}

function FitmentSizeCard({ label, size }: { label: string; size: VehicleFitmentSize }) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4 shadow-rest">
      <span className="type-eyebrow font-semibold text-muted">{label}</span>
      <span className="font-mono text-3xl font-bold leading-tight text-ink">{sizeLabel(size)}</span>
      <span className="text-sm text-muted">
        Load index {size.load_index} &middot; Speed rating {size.speed_rating}
      </span>
      {size.confidence !== "confirmed" && (
        <span className="text-sm font-medium text-black">Fitment confidence: {size.confidence}</span>
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
 * The 4-step cascade's terminal state: shows the vehicle's original-equipment
 * tyre size(s) large and in mono, then one action into the results.
 * Mirrors `/api/v1/tyres`'s staggered/non-staggered convention: one size block
 * for a non-staggered fitment, two Front / Rear blocks for a staggered one.
 *
 * The zero-fitment case (`fitments: {}`, a data-entry gap per the contract,
 * not an error) gets its own explanatory state, linking back to the manual
 * size search rather than dead-ending.
 *
 * The "Shop tyres for this fitment" links build their `/tyres` query via
 * `buildTyreSearchQuery` (`lib/catalog/search-params.ts`), the same utility
 * the search pagination uses. No `zone` is passed here: `/tyres` resolves the
 * zone itself server-side from the cookie, and a fresh handoff always starts
 * both sides at page 1.
 */
export function VehicleFitmentResult({ result }: { result: VehicleFitmentData }) {
  const { vehicle, is_staggered, fitments } = result;
  const label = vehicleLabel(vehicle);

  if (hasNoFitmentData(fitments)) {
    return (
      <div className="flex flex-col items-start gap-3 msg-warning rounded-card p-5 text-sm text-ink">
        <p>
          <strong>{label}</strong> &mdash; we don&apos;t have confirmed fitment data for this vehicle yet.
        </p>
        <p className="text-muted">
          Try searching by tyre size instead &mdash; check your existing tyre&apos;s sidewall for the width/profile/rim
          numbers.
        </p>
        <Link href="/tyres" className={buttonClassName({ variant: "secondary" })}>
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
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Confirmed fitment for <strong className="text-ink">{label}</strong> (staggered
          &mdash; front and rear differ)
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FitmentSizeCard label="Front" size={front} />
          <FitmentSizeCard label="Rear" size={rear} />
        </div>
        <Link href={href} className={buttonClassName({ fullWidth: true, className: "sm:w-auto sm:self-start" })}>
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
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Confirmed fitment for <strong className="text-ink">{label}</strong>
      </p>
      <FitmentSizeCard label="All four tyres" size={all} />
      <Link href={href} className={buttonClassName({ fullWidth: true, className: "sm:w-auto sm:self-start" })}>
        Shop tyres for this fitment
      </Link>
    </div>
  );
}
