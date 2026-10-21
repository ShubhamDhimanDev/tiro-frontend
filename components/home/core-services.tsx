import Link from "next/link";
import type { ReactNode } from "react";
import { Accordion } from "@/components/ui/accordion";
import { buttonClassName } from "@/components/ui/button";
import { BatteryIcon, EyeIcon, PatchIcon, RecycleIcon, RotateIcon, SearchIcon, TyreIcon, WrenchIcon } from "@/components/ui/icons";
import { SERVICE_CONTENT } from "@/lib/site/services";

const ICONS: Record<string, ReactNode> = {
  "tyre-sales": <TyreIcon className="h-6 w-6" />,
  "onsite-fitting": <WrenchIcon className="h-6 w-6" />,
  "puncture-repair": <PatchIcon className="h-6 w-6" />,
  "rotation-balancing": <RotateIcon className="h-6 w-6" />,
  inspections: <EyeIcon className="h-6 w-6" />,
  recycling: <RecycleIcon className="h-6 w-6" />,
  fleet: <BatteryIcon className="h-6 w-6" />,
};

/** "Our core services": heading + CTA left, icon accordion right. */
export function CoreServices() {
  const items = SERVICE_CONTENT.filter((s) => s.slug !== "fleet").map((s) => ({
    id: s.slug,
    title: s.title,
    icon: ICONS[s.slug],
    content: (
      <div className="flex flex-col items-start gap-2">
        <p className="max-w-[60ch]">{s.summary}</p>
        <Link href={`/services/${s.slug}`} className="inline-flex min-h-11 items-center font-bold text-black underline decoration-gold decoration-[3px] underline-offset-4">
          Learn more<span className="sr-only"> about {s.title}</span>
        </Link>
      </div>
    ),
  }));

  return (
    <section aria-labelledby="services-heading" className="container-page pt-[50px] lg:pt-20">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div className="flex flex-col items-start gap-4 lg:pt-4">
          <h2 id="services-heading" className="type-h2">
            Our core services
          </h2>
          <p className="max-w-md text-lg text-muted">
            Search our range of leading brands, then choose your tyres online or over the phone. A technician does the rest.
          </p>
          <Link href="/tyres" className={buttonClassName({ variant: "green", className: "w-full sm:w-auto" })}>
            <SearchIcon className="h-5 w-5" />
            Search tyres
          </Link>
        </div>
        <Accordion variant="icons" items={items} />
      </div>
    </section>
  );
}
