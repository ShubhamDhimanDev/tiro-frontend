/** Route-shell fallback for `/cart`, shaped like the loaded page (heading, list card, summary card). */
export default function CartLoading() {
  return (
    <div className="container-page flex max-w-6xl flex-col gap-6 py-6 md:py-10">
      <div className="flex flex-col gap-2">
        <div className="h-9 w-44 animate-pulse rounded-control bg-chip" aria-hidden />
        <div className="h-4 w-full max-w-md animate-pulse rounded-control bg-chip" aria-hidden />
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="h-72 animate-pulse rounded-card bg-chip" aria-hidden />
        <div className="mt-6 h-56 animate-pulse rounded-card bg-chip lg:mt-0" aria-hidden />
      </div>
    </div>
  );
}
