import Link from "next/link";
import { FinderNav } from "@/components/catalog/finder-nav";
import { PopularSizes } from "@/components/catalog/popular-sizes";
import { TyreSearchForm, type TyreSearchFormValues } from "@/components/catalog/tyre-search-form";
import { TYRE_TYPE_LABELS } from "@/lib/catalog/labels";
import { TYRE_TYPES, type PopularSize } from "@/lib/catalog/types";
import { isRegoEnabled } from "@/lib/rego/flag";

/**
 * `/tyres` with no size: the find-by-size page. Finder card on a grey band,
 * a "where to find your size" explainer (the sidewall diagram is a CSS
 * placeholder; see docs/prompts/IMAGE-MANIFEST.md), popular sizes, types and
 * links to the other ways in (vehicle, rego, brand).
 */
export function SizeFinderHub({ values, popular }: { values: TyreSearchFormValues; popular: PopularSize[] }) {
  return (
    <>
      <section aria-labelledby="hub-heading" className="border-b border-line bg-band">
        <div className="container-page py-8 md:py-12">
          <h1 id="hub-heading" className="type-h2">
            Find your tyre size
          </h1>
          <p className="mt-2 max-w-2xl text-muted">
            Choose the width, profile and rim from your tyre sidewall and we will show what fits, fitted at your place.
          </p>
          <div className="mt-6">
            <FinderNav active="size" rego={isRegoEnabled()} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
            <div className="rounded-card border border-line border-t-4 border-t-gold bg-surface p-4 shadow-raised md:p-6">
              <TyreSearchForm initial={values} finder />
            </div>
            <aside aria-labelledby="hub-help-heading" className="rounded-card border border-line bg-surface p-4 shadow-rest md:p-6">
              <h2 id="hub-help-heading" className="type-h3">
                Not sure of your size?
              </h2>
              <ul className="mt-3 flex flex-col gap-1 text-[15px]">
                <li>
                  <Link href="/tyres/by-vehicle" className="inline-flex min-h-11 items-center font-bold text-black underline underline-offset-4">
                    Find it by your vehicle
                  </Link>
                </li>
                <li>
                  <Link href="/guides" className="inline-flex min-h-11 items-center font-bold text-black underline underline-offset-4">
                    How to read your tyre size
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="inline-flex min-h-11 items-center font-bold text-black underline underline-offset-4">
                    Ask our team
                  </Link>
                </li>
              </ul>
              <p className="mt-2 text-sm text-muted">Fitting, delivery and wheel balancing are included in every fitted price.</p>
            </aside>
          </div>
        </div>
      </section>

      <div className="container-page flex flex-col gap-10 py-8 md:gap-12 md:py-12">
        <section aria-labelledby="hub-where-heading" className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10">
          <div>
            <h2 id="hub-where-heading" className="type-h2 mb-3">
              Where to find your tyre size
            </h2>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-muted marker:font-bold marker:text-black">
              <li>Look at the sidewall of the tyre on your car.</li>
              <li>
                Find a code like <b className="text-black">205/55 R16</b>. That is width, profile and rim.
              </li>
              <li>Pick those three numbers above. The load index and speed rating follow, for example 91V.</li>
            </ol>
            <p className="mt-4 text-sm text-muted">
              Not sure?{" "}
              <Link href="/tyres/by-vehicle" className="font-bold text-link underline underline-offset-4 hover:text-black">
                Find it by vehicle
              </Link>
              .
            </p>
          </div>
          {/* IMAGE SLOT: size-howto-sidewall.webp (see docs/prompts/IMAGE-MANIFEST.md). CSS placeholder until then. */}
          <div
            aria-hidden="true"
            className="asphalt-texture flex aspect-[4/3] items-center justify-center rounded-card"
          >
            <span className="rounded-full border-[14px] border-[#2a2a2a] px-8 py-10 text-center text-3xl font-extrabold tracking-normal text-gold">
              205/55 R16
              <span className="block text-base font-bold text-white/70">91V</span>
            </span>
          </div>
        </section>

        {popular.length > 0 && (
          <section aria-labelledby="hub-popular-heading">
            <h2 id="hub-popular-heading" className="type-h3 mb-3">
              Popular sizes
            </h2>
            <PopularSizes sizes={popular} />
          </section>
        )}

        <section aria-labelledby="hub-type-heading">
          <h2 id="hub-type-heading" className="type-h3 mb-3">
            Browse by type
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {TYRE_TYPES.map((type) => (
              <li key={type}>
                <Link
                  href={`/tyres/type/${type}`}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-ink/30 bg-surface px-4 text-center text-sm font-bold leading-tight text-black no-underline transition-colors hover:bg-chip sm:w-auto"
                >
                  {TYRE_TYPE_LABELS[type]}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <nav aria-label="Other ways to find tyres" className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {[
            { href: "/tyres/by-vehicle", label: "Find by vehicle" },
            ...(isRegoEnabled() ? [{ href: "/tyres/by-rego", label: "Find by number plate" }] : []),
            { href: "/brands", label: "Browse by brand" },
            { href: "/tyres/latest-releases", label: "Latest releases" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex min-h-11 items-center font-bold text-link underline underline-offset-4 hover:text-black">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
