/** Search/pagination skeleton for `/reviews` — same reasoning as `app/tyres/(catalog)/loading.tsx`. */
export default function ReviewsLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <div className="h-9 w-64 animate-pulse rounded-md bg-steel/30" aria-hidden />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-xs bg-steel/30" aria-hidden />
      </div>
      <div className="h-10 w-40 animate-pulse rounded-md bg-steel/30" aria-hidden />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-steel/30" aria-hidden />
        ))}
      </div>
    </div>
  );
}
