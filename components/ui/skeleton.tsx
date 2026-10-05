import type { HTMLAttributes } from "react";
import { cx } from "./cx";

/** Loading placeholder block. Decorative: hidden from assistive tech. */
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cx("animate-pulse rounded-control bg-chip motion-reduce:animate-none", className)}
      {...rest}
    />
  );
}
