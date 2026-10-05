import type { Metadata } from "next";
import Link from "next/link";
import { FinderNav } from "@/components/catalog/finder-nav";
import { VehiclePicker } from "@/components/vehicles/vehicle-picker";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { isRegoEnabled } from "@/lib/rego/flag";

export const metadata: Metadata = {
  title: "Find tyres for your vehicle | Tiro Mobile Tyres",
  description: "Select your vehicle's make, model, and year to see its confirmed tyre fitment, then shop matching tyres.",
};

/**
 * Manual make/model/year vehicle picker: the "identify vehicle" entry point
 * into `/tyres`, alongside the size search at `/tyres` itself. Client-rendered
 * inside `<VehiclePicker>` (every step is a live fetch); this shell is static.
 */
export default function VehicleFitmentPickerPage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Tyres", url: "/tyres" },
    { name: "Find by vehicle", url: "/tyres/by-vehicle" },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <section aria-labelledby="vehicle-heading" className="border-b border-line bg-band">
        <div className="container-page flex flex-col gap-6 pt-8 md:pt-12">
          <div>
            <h1 id="vehicle-heading" className="type-h2">
              Find tyres for your vehicle
            </h1>
            <p className="mt-2 max-w-2xl text-muted">
              Select your vehicle&apos;s make, model, and year to see its confirmed tyre fitment.
            </p>
          </div>
          <FinderNav active="vehicle" rego={isRegoEnabled()} />
        </div>
      </section>
      <div className="container-page flex max-w-3xl flex-col gap-6 py-8 md:py-12">
        <VehiclePicker />
        <p className="text-sm text-muted">
          Know your tyre size already?{" "}
          <Link href="/tyres" className="inline-flex min-h-11 items-center font-bold text-link underline underline-offset-4 hover:text-black">
            Search by size instead
          </Link>
          .
        </p>
      </div>
    </>
  );
}
