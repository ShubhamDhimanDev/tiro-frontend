import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cx } from "./cx";

const chipBase =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors duration-150";

/** Static label chip. */
export function Chip({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx(chipBase, "border-transparent bg-chip text-ink", className)} {...rest} />;
}

/** Toggle chip (filters, size pickers). Exposes state via `aria-pressed`. */
export function ChipButton({
  selected = false,
  className,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cx(
        chipBase,
        "cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
        selected ? "border-black bg-black text-white" : "border-line bg-surface text-ink hover:bg-chip",
        className,
      )}
      {...rest}
    />
  );
}
