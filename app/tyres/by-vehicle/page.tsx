import type { Metadata } from "next";
import Link from "next/link";
import { VehiclePicker } from "@/components/vehicles/vehicle-picker";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Find tyres for your vehicle | Tiro Mobile Tyres",
  description: "Select your vehicle's make, model, and year to see its confirmed tyre fitment, then shop matching tyres.",
};

/**
 * Manual make/model/year vehicle picker (Phase 2, requirements §2 step 2 /
 * §3.2's vehicle-browse discovery path) — the P0 "identify vehicle" entry
 * point into `/tyres`, alongside the manual size search already built at
 * `/tyres` itself. Rego-lookup UI is explicitly out of scope this round
 * (blocked on open decision #3 — see docs/architecture/06-open-decisions.md
 * item 3 and docs/plan/01-task-breakdown.md's Phase 2 row) — this page is
 * the whole P0 path.
 *
 * Client-rendered: every step of the cascade (make -> model -> year ->
 * fitment) is a live, user-driven fetch handled entirely inside
 * `<VehiclePicker>` — there's no server-fetched data for this page itself
 * to SSR/SSG around, so the page shell is a plain static Server Component
 * (metadata + breadcrumb only) wrapping the interactive client component.
 * Not a per-vehicle SEO landing page — `Vehicle.slug` is reserved for a
 * *possible* future vehicle-browse page per the task breakdown, not built
 * this round.
 */
export default function VehicleFitmentPickerPage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Tyres", url: "/tyres" },
    { name: "Find by vehicle", url: "/tyres/by-vehicle" },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <BreadcrumbJsonLd items={breadcrumbs} />
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Find tyres for your vehicle</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Select your vehicle&apos;s make, model, and year to see its confirmed tyre fitment.
        </p>
      </div>
      <VehiclePicker />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Know your tyre size already?{" "}
        <Link href="/tyres" className="underline underline-offset-2">
          Search by size instead
        </Link>
        .
      </p>
    </div>
  );
}
