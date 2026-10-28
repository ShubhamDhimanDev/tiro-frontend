import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { SearchIcon } from "@/components/ui/icons";

/** "$10 discount if you select our flexible booking option" banner. */
export function FlexibleBanner() {
  return (
    <section aria-labelledby="flex-heading" className="container-page pt-[50px] lg:pt-20">
      <div className="flex flex-col items-start gap-6 rounded-card bg-band p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:p-10">
        <div className="flex flex-col gap-4">
          <h2 id="flex-heading" className="type-h2 max-w-3xl">
            Receive a <span className="inline-block rounded-full bg-green px-4 py-0.5 text-white">$10 discount</span> if you select our flexible booking option
          </h2>
          <p className="max-w-xl text-lg text-muted">
            Flexible means your fitting is booked for anytime between 8am and 5pm, so we can fit you in around our other jobs.
          </p>
        </div>
        <Link href="/tyres" className={buttonClassName({ variant: "green", size: "lg", className: "w-full shrink-0 sm:w-auto" })}>
          <SearchIcon className="h-5 w-5" />
          Search tyres
        </Link>
      </div>
    </section>
  );
}
