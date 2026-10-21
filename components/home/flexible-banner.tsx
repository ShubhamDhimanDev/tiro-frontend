import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { SearchIcon } from "@/components/ui/icons";

/** "$10 discount if you select our flexible booking option" banner. */
export function FlexibleBanner() {
  return (
    <section aria-labelledby="flex-heading" className="container-page pt-[50px] lg:pt-20">
      <div className="flex flex-col items-start gap-4 lg:items-center lg:text-center">
        <h2 id="flex-heading" className="type-h2 max-w-3xl">
          Receive a <span className="inline-block rounded-full bg-green px-4 py-0.5 text-white">$10 discount</span> if you select our flexible booking option
        </h2>
        <p className="max-w-xl text-lg text-muted">
          Flexible means your fitting is booked for anytime between 8am and 5pm, so we can fit you in around our other jobs.
        </p>
        <Link href="/tyres" className={buttonClassName({ variant: "green", size: "lg", className: "w-full sm:w-auto" })}>
          <SearchIcon className="h-5 w-5" />
          Search tyres
        </Link>
      </div>
    </section>
  );
}
