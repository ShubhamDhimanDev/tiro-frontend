import { Skeleton } from "@/components/ui/skeleton";

/**
 * More specific than the parent `app/tyres/(catalog)/loading.tsx` grid
 * skeleton: `/tyres/by-vehicle` renders a stepper and a picker form, not a
 * results grid. Brief in practice (the page shell has no server fetch of its
 * own; `<VehiclePicker>` fetches client-side) but Next still shows it for the
 * RSC-payload round trip on a real network.
 */
export default function ByVehicleLoading() {
  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 py-8 md:py-12" role="status" aria-label="Loading vehicle finder">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-card" />
    </div>
  );
}
