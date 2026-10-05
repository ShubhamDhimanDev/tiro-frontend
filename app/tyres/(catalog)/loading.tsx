import { Skeleton } from "@/components/ui/skeleton";

/**
 * Results skeleton: shown while a `(catalog)` route's server fetch is in
 * flight (`/tyres?...`, and the fallback for `/tyres/type/[type]` and
 * `/tyres/latest-releases`; `/tyres/by-vehicle` has its own).
 *
 * Mirrors the real layout so nothing jumps when content arrives: compact
 * header row, then horizontal ~150px cards (one column on phones, two from
 * 768px, three from 1024px with the 260px sidebar column).
 *
 * Why `(catalog)`: this route group exists solely to scope this file's
 * automatic Suspense boundary to the search/browse routes. `/tyres/[slug]`
 * (the PDP) is deliberately kept as a *sibling* of this group, not nested
 * inside it: any `loading.tsx` in a route's ancestor chain forces streaming,
 * which commits the HTTP status to 200 before an async `notFound()` deeper in
 * the tree can run. The PDP needs a real 404 for unknown slugs. See
 * `app/tyres/[slug]/page.tsx` for the full story and
 * `components/ui/link-pending-overlay.tsx` for how the PDP still feels instant.
 */
export default function TyresLoading() {
  return (
    <div className="container-page pt-6 md:pt-10" role="status" aria-label="Loading tyres">
      <div className="flex items-center justify-between gap-4 pb-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="hidden h-11 w-32 rounded-full md:block" />
      </div>
      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
        <Skeleton className="hidden h-[28rem] rounded-card lg:block" />
        <ul className="grid gap-4 min-[576px]:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex h-[26rem] flex-col gap-3 rounded-card border border-line bg-surface p-3">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="mt-auto flex flex-col gap-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
