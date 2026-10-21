"use client";

import { useEffect, useId, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PROFILES, RIMS, WIDTHS } from "@/components/catalog/tyre-search-form";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { Select } from "@/components/ui/field";
import { ChevronDownIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { fetchTyreCount } from "@/lib/catalog/count-client";
import { CATALOG_MOCKS } from "@/lib/catalog/config";
import { LOAD_INDEX_OPTIONS, SPEED_RATINGS } from "@/lib/catalog/extra-filters";
import {
  buildFilterHref,
  countActiveFilters,
  SORT_OPTIONS,
  type FilterValues,
} from "@/lib/catalog/filters";
import { TYRE_CATEGORY_LABELS, TYRE_TYPE_LABELS } from "@/lib/catalog/labels";
import { TYRE_CATEGORIES, TYRE_TYPES, type TyreFacets } from "@/lib/catalog/types";

/**
 * URL-driven catalogue filters for the results page (design v2, phase 3).
 *
 * Nothing here holds results state: every change becomes a new `/tyres?...`
 * URL (see `buildFilterHref`), so results stay server-rendered and shareable,
 * and pagination restarts at page 1.
 *
 * - `FilterSidebar` (>= 992px): "Tyre details" selects (width, profile, rim,
 *   min load index, min speed rating, runflat) then "Additional filters"
 *   accordions (brands, pattern, price range, tyre type, vehicle, car make).
 *   Applies as you change.
 * - `FilterBar` (< 992px): sticky bottom bar "Filters (n) | Sort"; Filters
 *   opens a bottom sheet with the same fields as a draft and a sticky
 *   "Clear filters | Apply" footer.
 *
 * Phase 7: every filter is sent to the API (`buildTyreSearchQuery`), which
 * applies it server-side. Brand, tyre type, vehicle category and pattern are
 * multi-select (comma-separated in the URL). Option lists and counts come from
 * `GET /tyres/facets` (`facets` prop) when the size scope has them; without
 * facets (staggered search, stub backend, API error) the lists fall back to the
 * brands endpoint, the page's patterns and the fixed enums, and the car make
 * group is hidden (it has no data source), except in mock mode.
 * Render both with a `key` built from the current values so they remount and
 * resync their draft when new results arrive.
 */

export interface BrandOption {
  slug: string;
  name: string;
}

export interface PatternOption {
  slug: string;
  name: string;
}

/** Placeholder make list for the car make accordion. Mock mode only: the live list is `facets.car_makes`. */
export const CAR_MAKES = [
  "Toyota",
  "Mazda",
  "Hyundai",
  "Kia",
  "Ford",
  "Nissan",
  "Mitsubishi",
  "Subaru",
  "Volkswagen",
  "Honda",
  "BMW",
  "Mercedes-Benz",
  "Audi",
  "Tesla",
] as const;

const PRICE_STEPS = [50, 100, 150, 200, 250, 300, 400, 500] as const;

interface CommonProps {
  /** All current URL values (size, filters, sort). */
  values: Record<string, string | undefined>;
  brands: BrandOption[];
  patterns?: PatternOption[];
  /** `GET /tyres/facets` for the size scope; `null` when unavailable (staggered, stub, error). */
  facets?: TyreFacets | null;
}

function currentFilters(values: Record<string, string | undefined>): FilterValues {
  return {
    brand: values.brand,
    tyre_type: values.tyre_type,
    category: values.category,
    sort: values.sort,
    min_load: values.min_load,
    min_speed: values.min_speed,
    runflat: values.runflat,
    pattern: values.pattern,
    price_min: values.price_min,
    price_max: values.price_max,
    car_make: values.car_make,
  };
}

function useApplyFilters(values: Record<string, string | undefined>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  function apply(next: FilterValues) {
    startTransition(() => {
      router.push(buildFilterHref(values, next));
    });
  }
  return { apply, isPending };
}

/** Collapsible group: header button with an optional count badge, region below. */
function FilterGroup({
  title,
  count = 0,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="border-b border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center gap-2 text-left text-[15px] font-bold text-black"
      >
        <span className="flex-1">{title}</span>
        {count > 0 && (
          <span aria-label={`${count} selected`} className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gold px-1.5 text-xs font-extrabold text-black">
            {count}
          </span>
        )}
        <ChevronDownIcon aria-hidden="true" className={cx("h-4 w-4 shrink-0 transition-transform duration-300", open && "rotate-180")} />
      </button>
      <div id={`${id}-panel`} role="region" aria-label={title} hidden={!open} className="pb-4">
        {children}
      </div>
    </div>
  );
}

interface CheckOption {
  value: string;
  label: string;
  count?: number;
}

/** Multi-select checkbox list; the value is a comma-separated string (what the API's CSV params take). */
function CheckList({
  legend,
  options,
  value,
  onChange,
  scroll = false,
}: {
  legend: string;
  options: CheckOption[];
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  scroll?: boolean;
}) {
  const chosen = new Set(value ? value.split(",").filter(Boolean) : []);
  function toggle(v: string) {
    const next = new Set(chosen);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(next.size ? [...next].join(",") : undefined);
  }
  return (
    <fieldset className={cx("flex flex-col", scroll && "max-h-56 overflow-y-auto pr-1")}>
      <legend className="sr-only">{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-black">
          <input type="checkbox" checked={chosen.has(o.value)} onChange={() => toggle(o.value)} className="h-5 w-5 shrink-0 rounded-[4px] accent-black" />
          <span className="flex-1">{o.label}</span>
          {typeof o.count === "number" && <span className="text-xs text-muted">{o.count}</span>}
        </label>
      ))}
    </fieldset>
  );
}

function csvCount(value: string | undefined): number {
  return value ? value.split(",").filter(Boolean).length : 0;
}

/** Whole-dollar price steps inside the facet range (rounded out to $50), else the fixed steps. */
function priceSteps(facets: TyreFacets | null | undefined): number[] {
  if (!facets?.price) return [...PRICE_STEPS];
  const lo = Math.floor(facets.price.min / 100 / 50) * 50;
  const hi = Math.ceil(facets.price.max / 100 / 50) * 50;
  const steps: number[] = [];
  for (let p = lo; p <= hi; p += 50) steps.push(p);
  return steps.length > 1 ? steps : [...PRICE_STEPS];
}

/** Load index choices in steps of 5 across the facet range, else the fixed list. */
function loadSteps(facets: TyreFacets | null | undefined): number[] {
  if (!facets?.load_index) return [...LOAD_INDEX_OPTIONS];
  const steps: number[] = [];
  for (let n = Math.floor(facets.load_index.min / 5) * 5; n <= facets.load_index.max; n += 5) steps.push(n);
  return steps.length > 0 ? steps : [...LOAD_INDEX_OPTIONS];
}

function FilterFields({
  draft,
  values,
  onChange,
  brands,
  patterns = [],
  facets = null,
}: {
  draft: FilterValues;
  /** Current URL values, for the size fallback shown in the selects. */
  values: Record<string, string | undefined>;
  onChange: (next: FilterValues) => void;
  brands: BrandOption[];
  patterns?: PatternOption[];
  facets?: TyreFacets | null;
}) {
  const set = (patch: FilterValues) => onChange({ ...draft, ...patch });
  const staggered = values.staggered === "true";
  const brandCount = csvCount(draft.brand);
  const typeCount = csvCount(draft.tyre_type);
  const categoryCount = csvCount(draft.category);
  const patternCount = csvCount(draft.pattern);
  const priceCount = (draft.price_min ? 1 : 0) + (draft.price_max ? 1 : 0);
  const additional = brandCount + typeCount + categoryCount + (draft.car_make ? 1 : 0) + patternCount + priceCount;

  // Facet rows without a slug/value/name are ignored (malformed API data): the lists fall back to the static sources.
  const facetBrands = (facets?.brands ?? []).filter((b) => b.slug && b.name);
  const facetPatterns = (facets?.patterns ?? []).filter((p) => p.slug && p.name);
  const facetTypes = (facets?.tyre_types ?? []).filter((t) => t.value in TYRE_TYPE_LABELS);
  const facetCategories = (facets?.categories ?? []).filter((c) => c.value in TYRE_CATEGORY_LABELS);
  const brandOptions: CheckOption[] =
    facetBrands.length > 0
      ? facetBrands.map((b) => ({ value: b.slug, label: b.name, count: b.count }))
      : brands.map((b) => ({ value: b.slug, label: b.name }));
  // Patterns narrow to the chosen brands when facets say which brand each belongs to.
  const chosenBrands = new Set(draft.brand ? draft.brand.split(",") : []);
  const patternOptions: CheckOption[] =
    facetPatterns.length > 0
      ? facetPatterns
          .filter((p) => chosenBrands.size === 0 || chosenBrands.has(p.brand_slug))
          .map((p) => ({ value: p.slug, label: `${p.brand_name} ${p.name}`, count: p.count }))
      : patterns.map((p) => ({ value: p.slug, label: p.name }));
  const typeOptions: CheckOption[] =
    facetTypes.length > 0
      ? facetTypes.map((t) => ({ value: t.value, label: TYRE_TYPE_LABELS[t.value as keyof typeof TYRE_TYPE_LABELS], count: t.count }))
      : TYRE_TYPES.map((t) => ({ value: t, label: TYRE_TYPE_LABELS[t] }));
  const categoryOptions: CheckOption[] =
    facetCategories.length > 0
      ? facetCategories.map((c) => ({ value: c.value, label: TYRE_CATEGORY_LABELS[c.value as keyof typeof TYRE_CATEGORY_LABELS], count: c.count }))
      : TYRE_CATEGORIES.map((c) => ({ value: c, label: TYRE_CATEGORY_LABELS[c] }));
  const makeOptions: CheckOption[] = facets
    ? facets.car_makes.filter((m) => m.make).map((m) => ({ value: m.make.toLowerCase(), label: m.make, count: m.count }))
    : CATALOG_MOCKS
      ? CAR_MAKES.map((m) => ({ value: m.toLowerCase(), label: m }))
      : [];
  const speedOptions = facets && facets.speed_ratings.length > 0 ? facets.speed_ratings : [...SPEED_RATINGS];
  const prices = priceSteps(facets);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 border-b border-black pb-5">
        <p className="text-[15px] font-bold text-black">Tyre details</p>
        {!staggered && (
          <>
            <Select label="Width" value={draft.width ?? values.width ?? ""} onChange={(e) => set({ width: e.target.value || undefined })}>
              <option value="">All</option>
              {WIDTHS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </Select>
            <Select label="Profile" value={draft.profile ?? values.profile ?? ""} onChange={(e) => set({ profile: e.target.value || undefined })}>
              <option value="">All</option>
              {PROFILES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <Select label="Rim" value={draft.rim_diameter ?? values.rim_diameter ?? ""} onChange={(e) => set({ rim_diameter: e.target.value || undefined })}>
              <option value="">All</option>
              {RIMS.map((r) => (
                <option key={r} value={r}>
                  R{r}
                </option>
              ))}
            </Select>
          </>
        )}
        <Select label="Min. load index" value={draft.min_load ?? ""} onChange={(e) => set({ min_load: e.target.value || undefined })}>
          <option value="">All</option>
          {loadSteps(facets).map((n) => (
            <option key={n} value={n}>
              {n}+
            </option>
          ))}
        </Select>
        <Select label="Min. speed rating" value={draft.min_speed ?? ""} onChange={(e) => set({ min_speed: e.target.value || undefined })}>
          <option value="">All</option>
          {speedOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Select label="Runflat" value={draft.runflat ?? ""} onChange={(e) => set({ runflat: e.target.value || undefined })}>
          <option value="">All</option>
          <option value="yes">{facets ? `Yes (${facets.run_flat.yes})` : "Yes"}</option>
          <option value="no">{facets ? `No (${facets.run_flat.no})` : "No"}</option>
        </Select>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-[15px] font-bold text-black">Additional filters</p>
        <span aria-label={`${additional} active`} className="flex h-6 min-w-6 items-center justify-center rounded-full bg-chip px-1.5 text-xs font-extrabold text-black">
          {additional}
        </span>
      </div>
      <div className="mt-1 border-t border-black">
        {brandOptions.length > 0 && (
          <FilterGroup title="Brands" count={brandCount} defaultOpen={brandCount > 0}>
            <CheckList legend="Brand" scroll options={brandOptions} value={draft.brand} onChange={(brand) => set({ brand })} />
          </FilterGroup>
        )}
        {patternOptions.length > 0 && (
          <FilterGroup title="Pattern" count={patternCount} defaultOpen={patternCount > 0}>
            <CheckList legend="Pattern" scroll options={patternOptions} value={draft.pattern} onChange={(pattern) => set({ pattern })} />
          </FilterGroup>
        )}
        <FilterGroup title="Price range" count={priceCount}>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Min ($)" value={draft.price_min ?? ""} onChange={(e) => set({ price_min: e.target.value || undefined })}>
              <option value="">Any</option>
              {prices.map((p) => (
                <option key={p} value={p}>
                  ${p}
                </option>
              ))}
            </Select>
            <Select label="Max ($)" value={draft.price_max ?? ""} onChange={(e) => set({ price_max: e.target.value || undefined })}>
              <option value="">Any</option>
              {prices.map((p) => (
                <option key={p} value={p}>
                  ${p}
                </option>
              ))}
            </Select>
          </div>
          <p className="mt-2 text-xs text-muted">Price per tyre, fitted.</p>
        </FilterGroup>
        <FilterGroup title="Tyre type" count={typeCount} defaultOpen={typeCount > 0}>
          <CheckList legend="Tyre type" options={typeOptions} value={draft.tyre_type} onChange={(tyre_type) => set({ tyre_type })} />
        </FilterGroup>
        <FilterGroup title="Vehicle" count={categoryCount} defaultOpen={categoryCount > 0}>
          <CheckList legend="Vehicle" options={categoryOptions} value={draft.category} onChange={(category) => set({ category })} />
        </FilterGroup>
        {makeOptions.length > 0 && (
          <FilterGroup title="Car make" count={draft.car_make ? 1 : 0} defaultOpen={Boolean(draft.car_make)}>
            <CheckList
              legend="Car make"
              scroll
              options={makeOptions}
              value={draft.car_make}
              onChange={(next) => set({ car_make: next ? next.split(",").pop() : undefined })}
            />
          </FilterGroup>
        )}
      </div>
    </div>
  );
}

/** Desktop sort control, shown in the results header. */
export function SortSelect({ values, className }: { values: Record<string, string | undefined>; className?: string }) {
  const { apply, isPending } = useApplyFilters(values);
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        Sort by
      </label>
      <select
        id={id}
        value={values.sort ?? ""}
        disabled={isPending}
        onChange={(e) => apply({ ...currentFilters(values), sort: e.target.value || undefined })}
        className="min-h-12 rounded-control border border-field bg-surface px-4 text-sm font-bold text-black hover:border-black"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            Sort: {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FilterSidebar({ values, brands, patterns, facets }: CommonProps & { sizeLabel?: string; sizeValues?: unknown }) {
  const { apply, isPending } = useApplyFilters(values);
  const [draft, setDraft] = useState<FilterValues>(currentFilters(values));
  const active = countActiveFilters(draft);

  function change(next: FilterValues) {
    setDraft(next);
    apply({ ...next, sort: values.sort });
  }

  return (
    <aside
      id="filters"
      aria-label="Filters"
      aria-busy={isPending}
      className="sticky hidden max-h-[calc(100dvh-9rem)] lg:top-32 self-start overflow-y-auto pr-1 lg:block"
    >
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-line pb-3">
        <h2 className="text-xl font-bold tracking-normal text-black">Filters{active > 0 ? ` (${active})` : ""}</h2>
        <button
          type="button"
          onClick={() => change({})}
          disabled={active === 0}
          className="inline-flex min-h-11 items-center text-sm font-medium text-link underline underline-offset-4 hover:text-black disabled:text-muted disabled:no-underline"
        >
          Clear filters
        </button>
      </div>
      <FilterFields draft={draft} values={values} onChange={change} brands={brands} patterns={patterns} facets={facets} />
    </aside>
  );
}

export function FilterBar({ values, brands, patterns, facets }: CommonProps) {
  const { apply, isPending } = useApplyFilters(values);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterValues>(currentFilters(values));
  const applied = countActiveFilters(currentFilters(values));
  const sortId = useId();

  // "Show N tyres": while the sheet is open, ask how many tyres the draft would match (debounced).
  // `undefined` means not known yet (or unavailable), and the button then just says "Apply".
  const draftQuery = new URL(buildFilterHref(values, draft), "http://localhost").searchParams.toString();
  const [counted, setCounted] = useState<{ key: string; total: number | null } | null>(null);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetchTyreCount(draftQuery, controller.signal).then((total) => {
        if (!controller.signal.aborted) setCounted({ key: draftQuery, total });
      });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, draftQuery]);
  const matchCount = counted && counted.key === draftQuery ? counted.total : null;

  function openSheet() {
    setDraft(currentFilters(values));
    setOpen(true);
  }

  function applyDraft() {
    setOpen(false);
    apply({ ...draft, sort: values.sort });
  }

  return (
    <>
      <div className="sticky bottom-0 z-30 mt-auto -mx-5 border-t border-line bg-surface px-5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-raised md:-mx-6 md:px-6 lg:hidden">
        <div className="grid h-12 grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-2" data-testid="filter-bar">
          <button
            type="button"
            onClick={openSheet}
            aria-haspopup="dialog"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-control border-2 border-black bg-gold px-4 text-sm font-bold text-black transition-colors hover:bg-[#e6b900]"
          >
            Filters ({applied})
          </button>
          <div className="relative flex h-12 items-center rounded-control border-2 border-black px-4">
            <label htmlFor={sortId} className="pointer-events-none text-sm font-bold text-black">
              Sort
            </label>
            <select
              id={sortId}
              value={values.sort ?? ""}
              disabled={isPending}
              onChange={(e) => apply({ ...currentFilters(values), sort: e.target.value || undefined })}
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-control bg-transparent pr-4 pl-16 text-right text-base text-muted"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.short}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        footer={
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setDraft({})}
              disabled={countActiveFilters(draft) === 0}
              className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap text-sm font-medium text-black underline underline-offset-4 disabled:text-muted disabled:no-underline"
            >
              Clear filters
            </button>
            <Button variant="yellow" onClick={applyDraft} fullWidth disabled={matchCount === 0} data-testid="filter-apply">
              {matchCount === null ? "Apply" : matchCount === 0 ? "No tyres match" : `Show ${matchCount} ${matchCount === 1 ? "tyre" : "tyres"}`}
            </Button>
          </div>
        }
      >
        <FilterFields draft={draft} values={values} onChange={setDraft} brands={brands} patterns={patterns} facets={facets} />
        <p role="status" aria-live="polite" className="sr-only">
          {matchCount === null ? "" : matchCount === 0 ? "No tyres match these filters." : `${matchCount} ${matchCount === 1 ? "tyre matches" : "tyres match"} these filters.`}
        </p>
      </Sheet>
    </>
  );
}
