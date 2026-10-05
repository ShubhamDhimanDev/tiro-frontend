import { TYRE_TYPE_LABELS } from "./labels";
import type { BrandSummary, TyreType } from "./types";

/**
 * Short, generic SEO copy shown in the collapsible block after the results.
 * It is deliberately factual and free of prices, delivery promises and other
 * claims that need client sign-off. Unique per-page copy from the CMS replaces
 * these when the API exposes it (there is no brand/size/type copy field yet).
 */

export function sizeSeoCopy(size: string): string[] {
  return [
    `${size} is the size moulded into the sidewall of your current tyres. The first number is the section width in millimetres, the second is the sidewall height as a percentage of that width, and the R number is the wheel diameter in inches.`,
    "Always match the size, load index and speed rating recommended for your vehicle. If you are not sure, check the tyre placard on the driver's door jamb or search by vehicle, and we will show the fitments for it.",
    "Set your location to see the price and stock for your suburb. Your tyres are fitted where you are.",
  ];
}

const TYPE_COPY: Record<TyreType, string> = {
  highway:
    "Highway tyres are built for sealed roads: quiet, comfortable and long wearing, with good wet-weather grip for daily driving.",
  all_terrain:
    "All-terrain tyres balance everyday road manners with extra grip on gravel, dirt and light off-road tracks.",
  mud_terrain:
    "Mud-terrain tyres have an aggressive tread for loose, soft or rocky ground. Expect more road noise than a highway tyre.",
  performance:
    "Performance tyres favour steering response and cornering grip, and suit sports cars and drivers who want a sharper feel.",
  eco: "Eco tyres are designed to reduce rolling resistance, which can help lower fuel use on long, steady drives.",
};

export function typeSeoCopy(type: TyreType): string[] {
  return [
    TYPE_COPY[type],
    `Browse ${TYRE_TYPE_LABELS[type].toLowerCase()} tyres below, then check the size, load index and speed rating against your vehicle before you order. Search by size or by vehicle if you want to narrow the list.`,
  ];
}

export function brandSeoCopy(brand: BrandSummary): string[] {
  const origin = brand.country_of_origin ? ` ${brand.name} is manufactured in ${brand.country_of_origin}.` : "";
  return [
    `Browse ${brand.name} tyres available for mobile fitting.${origin}`,
    "Enter your tyre size to see which patterns fit your vehicle, then set your location for price and stock in your suburb.",
  ];
}

export const LATEST_SEO_COPY = [
  "These are the newest tyre models added to the range, newest first. Newer patterns often bring improvements in wet grip, noise or wear, so they are worth a look if you are replacing a full set.",
];
