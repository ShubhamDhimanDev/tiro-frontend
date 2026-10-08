import Link from "next/link";
import { Accordion } from "@/components/ui/accordion";
import { buttonClassName } from "@/components/ui/button";
import { CheckIcon, PinIcon, ShieldIcon, TyreIcon } from "@/components/ui/icons";

/** CSS phone mock-up, placeholder for a real app/PDP screenshot. */
function PhoneMock() {
  return (
    <div aria-hidden="true" className="mx-auto w-[220px] rounded-[34px] border-[8px] border-black bg-black shadow-raised md:w-[260px]">
      <div className="overflow-hidden rounded-[26px] bg-white">
        <div className="h-5 bg-black" />
        <div className="flex flex-col gap-3 p-4">
          <div className="h-3 w-24 rounded bg-chip" />
          <div className="flex h-28 items-center justify-center rounded-card bg-band">
            <TyreIcon className="h-20 w-20 text-black" strokeWidth={1.2} />
          </div>
          <div className="h-3 w-32 rounded bg-black" />
          <div className="h-3 w-20 rounded bg-chip" />
          <div className="flex items-end justify-between">
            <span className="h-6 w-16 rounded bg-green" />
            <span className="h-6 w-14 rounded bg-gold" />
          </div>
          <div className="h-10 rounded-control bg-green" />
        </div>
      </div>
    </div>
  );
}

const ITEMS = [
  {
    id: "brands",
    title: "Best brands, best prices",
    icon: <TyreIcon className="h-6 w-6" />,
    content:
      "Choose from the brands we stock at one fitted price. Compare premium, mid-range and budget options side by side and pick what suits your car and your budget.",
  },
  {
    id: "anywhere",
    title: "Home, work, anywhere",
    icon: <PinIcon className="h-6 w-6" />,
    content:
      "Tell us where the car will be and when. Our technician brings the equipment to your driveway, workplace or car park, so there is nothing to drop off or collect.",
  },
  {
    id: "trusted",
    title: "Trusted across Australia",
    icon: <ShieldIcon className="h-6 w-6" />,
    content:
      "Fitting, balancing, new valves and old-tyre recycling are part of the price you see. If you find the same tyre fitted for less, tell us and we will look at it.",
  },
];

/** "Get the best deals online" two-column block with the three SEO accordions. */
export function DealsOnline() {
  return (
    <section aria-labelledby="deals-heading" className="container-page pt-[50px] lg:pt-20">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        {/* Decorative CSS mock-up: no information in it, so phones skip it (it added about 340px of scrolling). */}
        <div className="order-2 max-md:hidden lg:order-1">
          <PhoneMock />
        </div>
        <div className="order-1 flex flex-col gap-4 lg:order-2">
          <h2 id="deals-heading" className="type-h2">
            Get the best deals online, fitted on your doorstep
          </h2>
          <p className="max-w-xl text-lg text-muted">
            Choose your tyres online or by phone, pick a time that suits you, and we bring the tyre shop to you.
          </p>
          <Accordion variant="icons" items={ITEMS} defaultOpenId="brands" />
          <Link href="/tyres" className={buttonClassName({ variant: "green", className: "mt-2 w-full sm:w-fit" })}>
            <CheckIcon className="h-5 w-5" />
            Shop tyres
          </Link>
        </div>
      </div>
    </section>
  );
}
