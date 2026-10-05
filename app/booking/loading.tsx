/** Route-shell fallback for `/booking`, shaped like the loaded page. `<BookingFlow>` has its own skeleton for the client-side hold/cart hydration; this covers the navigation round trip before that mounts. */
export default function BookingLoading() {
  return (
    <div className="container-page flex max-w-4xl flex-col gap-6 py-6 md:py-10">
      <div className="flex flex-col gap-2">
        <div className="h-9 w-64 animate-pulse rounded-control bg-chip" aria-hidden />
        <div className="h-4 w-full max-w-md animate-pulse rounded-control bg-chip" aria-hidden />
      </div>
      <div className="h-24 animate-pulse rounded-card bg-chip" aria-hidden />
      <div className="h-72 animate-pulse rounded-card bg-chip" aria-hidden />
    </div>
  );
}
