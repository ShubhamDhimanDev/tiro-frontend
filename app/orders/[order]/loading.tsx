/** Route-shell fallback for `/orders/[order]`; `<OrderStatusView>` has its own skeleton for the client-side fetch, this covers the navigation round trip before that mounts. */
export default function OrderLoading() {
  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 py-6 md:py-10">
      <div className="flex flex-col gap-2">
        <div className="h-9 w-48 animate-pulse rounded-control bg-chip" aria-hidden />
        <div className="h-4 w-full max-w-md animate-pulse rounded-control bg-chip" aria-hidden />
      </div>
      <div className="h-40 animate-pulse rounded-card bg-chip" aria-hidden />
      <div className="h-56 animate-pulse rounded-card bg-chip" aria-hidden />
    </div>
  );
}
