import { cx } from "./cx";

const SIZES = { sm: 24, md: 48, lg: 88 } as const;

/**
 * Brand loader: a spinning tyre (black tread blocks, yellow rim, spokes)
 * rolling along a dashed road line. Pure SVG + CSS keyframes (`.tyre-loader-*`
 * in globals.css), so it is a server component and works inside `loading.tsx`
 * before any JS has hydrated. Reduced motion freezes it via the global override.
 *
 * `label` is the accessible name (role="status"); pass `label={null}` when a
 * parent already announces the loading state (decorative, aria-hidden).
 */
export function TyreLoader({
  size = "md",
  label = "Loading",
  showRoad = true,
  className,
}: {
  size?: keyof typeof SIZES;
  label?: string | null;
  showRoad?: boolean;
  className?: string;
}) {
  const px = SIZES[size];
  const a11y = label === null ? { "aria-hidden": true as const } : { role: "status" as const, "aria-label": label };
  return (
    <span className={cx("inline-flex flex-col items-center", className)} {...a11y}>
      <svg width={px} height={px} viewBox="0 0 100 100" className="tyre-loader-spin" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="#000" />
        {/* Tread blocks: dashes on a ring, so the spin reads as rolling. */}
        <circle cx="50" cy="50" r="42" fill="none" stroke="#3a3a3a" strokeWidth="7" strokeDasharray="9 7.1" />
        <circle cx="50" cy="50" r="30" fill="#ffce00" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="#000" strokeWidth="2" opacity="0.2" />
        {[0, 72, 144, 216, 288].map((deg) => (
          <rect key={deg} x="47.5" y="24" width="5" height="21" rx="2.5" fill="#000" transform={`rotate(${deg} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="6" fill="#000" />
      </svg>
      {showRoad && size !== "sm" && (
        <span aria-hidden="true" className="tyre-loader-road mt-1 block h-[3px] overflow-hidden rounded-full bg-chip" style={{ width: px * 1.4 }}>
          <span className="tyre-loader-road-dash block h-full w-[200%]" />
        </span>
      )}
      {label !== null && <span className="sr-only">{label}</span>}
    </span>
  );
}

/** Centred loader for a route/section that has no content shape to skeleton. */
export function TyreLoaderPanel({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div className={cx("flex min-h-[40vh] flex-col items-center justify-center gap-3 py-12", className)}>
      <TyreLoader size="lg" label={label} />
      <p aria-hidden="true" className="text-sm font-semibold text-muted">
        {label}…
      </p>
    </div>
  );
}
