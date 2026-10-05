import type { Metadata } from "next";
import Link from "next/link";
import { FinderNav } from "@/components/catalog/finder-nav";
import { RegoPanel } from "@/components/home/hero-finder";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { buttonClassName } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/state-panel";
import { isRegoEnabled } from "@/lib/rego/flag";

export const metadata: Metadata = {
  title: "Find tyres by number plate | Tiro Mobile Tyres",
  description: "Enter your number plate and state to see tyres that fit your vehicle.",
};

/**
 * Find by number plate. The lookup is behind `NEXT_PUBLIC_FEATURE_REGO` (see
 * `lib/rego/flag.ts`); with the flag off the page says so and points to the
 * size and vehicle finders instead of showing a form that cannot work.
 */
export default function FindByRegoPage() {
  const enabled = isRegoEnabled();
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Tyres", url: "/tyres" },
          { name: "Find by number plate", url: "/tyres/by-rego" },
        ]}
      />
      <section aria-labelledby="rego-heading" className="border-b border-line bg-band">
        <div className="container-page flex flex-col gap-6 pt-8 md:pt-12">
          <div>
            <h1 id="rego-heading" className="type-h2">
              Find tyres by number plate
            </h1>
            <p className="mt-2 max-w-2xl text-muted">Enter your plate and state and we will show the sizes that fit your vehicle.</p>
          </div>
          <FinderNav active="rego" rego={enabled} />
        </div>
      </section>
      <div className="container-page max-w-xl py-8 md:py-12">
        {enabled ? (
          <div className="rounded-card border border-line bg-surface p-5 shadow-rest md:p-8">
            <RegoPanel />
          </div>
        ) : (
          <StatePanel
            tone="info"
            title="Number plate search is coming soon"
            actions={
              <>
                <Link href="/tyres" className={buttonClassName()}>
                  Search by size
                </Link>
                <Link href="/tyres/by-vehicle" className={buttonClassName({ variant: "secondary" })}>
                  Find by vehicle
                </Link>
              </>
            }
          >
            Until then, pick your tyre size or choose your make, model and year.
          </StatePanel>
        )}
      </div>
    </>
  );
}
