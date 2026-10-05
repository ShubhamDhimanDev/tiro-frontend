/**
 * Route-shell fallback for `/checkout`, shaped like the loaded page (heading,
 * stepper, two columns). `<CheckoutFlow>` has its own in-component skeleton for
 * its client fetch; this covers the navigation round trip before that mounts.
 */
export default function CheckoutLoading() {
  return (
    <div className="container-page flex max-w-6xl flex-col gap-6 py-6 md:py-10">
      <div className="flex flex-col gap-2">
        <div className="h-9 w-44 animate-pulse rounded-control bg-chip" aria-hidden />
        <div className="h-4 w-full max-w-md animate-pulse rounded-control bg-chip" aria-hidden />
      </div>
      <div className="grid grid-cols-5 gap-3" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 animate-pulse rounded-control bg-chip" />
        ))}
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="flex flex-col gap-6">
          <div className="h-28 animate-pulse rounded-card bg-chip" aria-hidden />
          <div className="h-56 animate-pulse rounded-card bg-chip" aria-hidden />
          <div className="h-72 animate-pulse rounded-card bg-chip" aria-hidden />
        </div>
        <div className="mt-6 hidden h-64 animate-pulse rounded-card bg-chip lg:mt-0 lg:block" aria-hidden />
      </div>
    </div>
  );
}
