import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { CalendarIcon, SearchIcon, TruckIcon } from "@/components/ui/icons";
import { HOME_STEPS } from "@/lib/home/content";

const ICONS = [SearchIcon, CalendarIcon, TruckIcon];

/** "How it works": three numbered steps with yellow circle icons. */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="container-page pt-[50px] lg:pt-20">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
        <div className="flex flex-col gap-5">
          <h2 id="how-heading" className="type-h2">
            How it works
          </h2>
          <p className="max-w-xl text-lg text-muted">New tyres fitted at home or at work. The tyre shop that comes to you.</p>
          <ol className="flex flex-col gap-5">
            {HOME_STEPS.map((step, i) => {
              const Icon = ICONS[i];
              return (
                <li key={step.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-gold text-black"
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="type-h3">
                      <span className="sr-only">Step </span>
                      {i + 1}. {step.title}
                    </h3>
                    <p className="mt-1 text-[15px] text-muted">{step.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <Link href="/tyres" className={buttonClassName({ variant: "yellow", className: "w-fit" })}>
            <SearchIcon className="h-5 w-5" />
            Search tyres
          </Link>
        </div>

        {/* Placeholder illustration: replace with a van/car photo. */}
        <div
          aria-hidden="true"
          className="asphalt-texture relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-card"
        >
          <span className="absolute -left-6 top-0 h-full w-16 -skew-x-[18deg] bg-gold opacity-90" />
          <span className="absolute left-14 top-0 h-full w-6 -skew-x-[18deg] bg-gold opacity-90" />
          <TruckIcon className="h-28 w-28 text-white" strokeWidth={1.2} />
        </div>
      </div>
    </section>
  );
}
