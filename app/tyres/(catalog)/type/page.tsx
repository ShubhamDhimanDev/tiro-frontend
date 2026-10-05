import type { Metadata } from "next";
import Link from "next/link";
import { FinderNav } from "@/components/catalog/finder-nav";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { typeSeoCopy } from "@/lib/catalog/copy";
import { TYRE_TYPE_LABELS } from "@/lib/catalog/labels";
import { TYRE_TYPES } from "@/lib/catalog/types";
import { ArrowRightIcon } from "@/components/ui/icons";
import { isRegoEnabled } from "@/lib/rego/flag";

export const metadata: Metadata = {
  title: "Find tyres by type | Tiro Mobile Tyres",
  description: "Highway, all-terrain, mud-terrain, performance and eco tyres, fitted at your place.",
};

export const revalidate = 3600;

/** Find by type: one tile per tyre type, linking to its listing page. Static. */
export default function TyreTypesIndexPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Tyres", url: "/tyres" },
          { name: "Find by type", url: "/tyres/type" },
        ]}
      />
      <section aria-labelledby="types-heading" className="border-b border-line bg-band">
        <div className="container-page flex flex-col gap-6 pt-8 md:pt-12">
          <div>
            <h1 id="types-heading" className="type-h2">
              Find tyres by type
            </h1>
            <p className="mt-2 max-w-2xl text-muted">Not sure of your size yet? Start with the kind of driving you do.</p>
          </div>
          <FinderNav active="type" rego={isRegoEnabled()} />
        </div>
      </section>
      <div className="container-page py-8 md:py-12">
        <ul aria-label="Tyre types" className="grid gap-4 min-[576px]:grid-cols-2 lg:grid-cols-3">
          {TYRE_TYPES.map((type) => (
            <li key={type}>
              <Link
                href={`/tyres/type/${type}`}
                className="group flex h-full flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-rest transition-shadow hover:shadow-raised"
              >
                <span className="text-lg font-extrabold text-black">{TYRE_TYPE_LABELS[type]}</span>
                <span className="text-sm text-muted">{typeSeoCopy(type)[0]}</span>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-bold text-link group-hover:underline">
                  View {TYRE_TYPE_LABELS[type].toLowerCase()} tyres
                  <ArrowRightIcon className="h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
