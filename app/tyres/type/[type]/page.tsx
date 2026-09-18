import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { catalogBackend } from "@/lib/catalog/backend";
import { TyreResultsGrid } from "@/components/catalog/tyre-results-grid";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { TYRE_TYPE_LABELS } from "@/lib/catalog/labels";
import { TYRE_TYPES, type Paginator, type TyreListItem, type TyreType } from "@/lib/catalog/types";

/** Browse by tyre type — fixed enum (docs/architecture/01-data-model.md), so every valid path is known upfront: SSG at build time, no on-demand fallback needed. */
export const dynamicParams = false;
export const revalidate = 3600;

export async function generateStaticParams() {
  return TYRE_TYPES.map((type) => ({ type }));
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  if (!TYRE_TYPES.includes(type as TyreType)) return {};
  const label = TYRE_TYPE_LABELS[type as TyreType];
  return {
    title: `${label} tyres | Tiro Mobile Tyres`,
    description: `Browse ${label.toLowerCase()} tyres available for mobile fitting.`,
  };
}

export default async function TyreTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!TYRE_TYPES.includes(type as TyreType)) notFound();
  const tyreType = type as TyreType;
  const label = TYRE_TYPE_LABELS[tyreType];

  const query = new URLSearchParams({ tyre_type: tyreType, per_page: "24" });
  const result = await catalogBackend.search(query, { next: { revalidate: 3600 } });
  const items = result.status === 200 ? (result.body as Paginator<TyreListItem>).data : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: `${label} tyres`, url: `/tyres/type/${tyreType}` }]} />
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{label} tyres</h1>
      <TyreResultsGrid items={items} emptyMessage={`No ${label.toLowerCase()} tyres available right now.`} />
    </div>
  );
}
