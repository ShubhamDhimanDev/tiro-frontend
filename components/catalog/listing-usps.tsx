import { CheckIcon, TruckIcon, WrenchIcon } from "@/components/ui/icons";

const ITEMS = [
  { icon: TruckIcon, text: "We come to you" },
  { icon: WrenchIcon, text: "Fitting, balancing and recycling included" },
  { icon: CheckIcon, text: "Pick your time at checkout" },
];

/** Three-point trust row under a listing heading. Copy mirrors the canonical inclusions (`lib/site/inclusions.ts`). */
export function ListingUsps() {
  return (
    <>
      {/* Phones: one line instead of three tall rows, so tyres start sooner. */}
      <p className="text-sm font-medium text-black sm:hidden">We come to you. Fitting, balancing and recycling included.</p>
      <ul className="hidden gap-2 text-sm font-medium text-black sm:flex sm:flex-row sm:flex-wrap sm:gap-x-6">
      {ITEMS.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2">
          <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold">
            <Icon className="h-4 w-4" />
          </span>
          {text}
        </li>
      ))}
      </ul>
    </>
  );
}
