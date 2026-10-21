import type { ComponentType, SVGProps } from "react";
import Image from "next/image";
import Link from "next/link";
import { SedanIcon, SuvIcon, TruckIcon, UteIcon } from "@/components/ui/icons";
import { HOME_VEHICLE_TYPES } from "@/lib/home/content";
import type { TyreCategory } from "@/lib/catalog/types";
import { CONTENT_IMAGES } from "@/lib/site/content-images";

const ICONS: Record<TyreCategory, ComponentType<SVGProps<SVGSVGElement>>> = { car: SedanIcon, suv: SuvIcon, "4x4": UteIcon, light_truck: TruckIcon };

/**
 * Dark "Mobile tyre fitting for every vehicle" band: one tile per catalogue category, each linking to /tyres filtered by it.
 * The road photo (a decorative background, faded to near-black on the right) is shown from md up; until its file exists
 * (see `lib/site/content-images.ts`) and on phones the band is a plain dark gradient, so white labels and yellow icons keep
 * their contrast either way. Static; no data fetching.
 */
export function VehicleBand() {
  const photo = CONTENT_IMAGES["home-vehicle-band"];
  return (
    <section
      aria-labelledby="vehicle-heading"
      className="relative mt-[50px] overflow-hidden bg-gradient-to-r from-[#3a3a3a] via-[#191919] to-black lg:mt-20"
    >
      {photo.src && (
        // Lazy and display:none on phones, so they never download it.
        <div aria-hidden="true" className="absolute inset-0 hidden md:block">
          <Image src={photo.src} alt="" fill sizes="100vw" className="object-cover object-left" />
        </div>
      )}
      <div className="container-page relative py-10 lg:py-14">
        <h2 id="vehicle-heading" className="type-h2 mb-6 text-white">
          Mobile tyre fitting for every vehicle
        </h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {HOME_VEHICLE_TYPES.map(({ category, label, href }) => {
            const Icon = ICONS[category];
            return (
              <li key={category} className="flex">
                <Link
                  href={href}
                  className="flex min-h-[7.5rem] w-full flex-col items-center justify-center gap-3 rounded-card border border-white/25 bg-black/40 px-3 py-5 text-center text-base font-bold text-white transition-colors duration-300 hover:border-white hover:bg-black/70"
                >
                  <Icon className="h-12 w-12 text-gold" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
