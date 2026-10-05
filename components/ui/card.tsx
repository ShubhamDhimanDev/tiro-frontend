import type { ElementType, HTMLAttributes } from "react";
import { cx } from "./cx";

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  /** `rest` (flat, default) or `raised` (hover/featured). */
  elevation?: "rest" | "raised";
  padded?: boolean;
};

/** Surface container: 10px radius, line border, rest shadow. */
export function Card({ as: Tag = "div", elevation = "rest", padded = true, className, ...rest }: CardProps) {
  return (
    <Tag
      className={cx(
        "rounded-card border border-line bg-surface text-ink",
        elevation === "raised" ? "shadow-raised" : "shadow-rest",
        padded && "p-4 md:p-6",
        className,
      )}
      {...rest}
    />
  );
}
