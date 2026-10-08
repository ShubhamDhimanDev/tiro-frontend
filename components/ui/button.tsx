import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cx } from "./cx";
import { TyreLoader } from "./tyre-loader";

export type ButtonVariant = "primary" | "green" | "yellow" | "black" | "danger" | "secondary" | "ghost" | "gold";
export type ButtonSize = "md" | "sm" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-control border-2 font-bold max-w-full text-center transition-colors duration-300 ease-out disabled:cursor-not-allowed disabled:border-dashed";

const green =
  "border-green bg-green text-white hover:border-green-hover hover:bg-green-hover disabled:border-disabled-border disabled:bg-disabled-bg disabled:text-disabled-text";
const yellow =
  "border-gold bg-gold text-black hover:border-[#e6b900] hover:bg-[#e6b900] disabled:border-disabled-border disabled:bg-disabled-bg disabled:text-disabled-text";

const variants: Record<ButtonVariant, string> = {
  // Primary action: green ("Find tyres", "Add to cart").
  primary: green,
  green,
  // Brand yellow: header CTA, subscribe, confirm.
  yellow,
  gold: yellow,
  black:
    "border-black bg-black text-white hover:border-[#333] hover:bg-[#333] disabled:border-disabled-border disabled:bg-disabled-bg disabled:text-disabled-text",
  // Destructive: black (the palette has no red).
  danger:
    "border-black bg-black text-white hover:border-[#333] hover:bg-[#333] disabled:border-disabled-border disabled:bg-disabled-bg disabled:text-disabled-text",
  // Black outline.
  secondary:
    "border-black bg-transparent text-black hover:bg-black hover:text-white disabled:border-disabled-border disabled:bg-disabled-bg disabled:text-disabled-text disabled:hover:bg-disabled-bg",
  ghost: "border-transparent bg-transparent text-black hover:bg-chip disabled:text-disabled-text disabled:hover:bg-transparent",
};

const sizes: Record<ButtonSize, string> = {
  lg: "min-h-[62px] px-6 text-[17px]", // finder CTA
  md: "min-h-12 px-6 text-[15px]", // 48px
  sm: "min-h-11 px-4 text-sm md:min-h-10", // 44px on touch, 40px md+
};

/** Class string for anything that should look like a Button (e.g. `<Link>`). */
export function buttonClassName({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return cx(base, variants[variant], sizes[size], fullWidth && "w-full", className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Shows a spinner, sets `aria-busy`, and blocks clicks. Label stays visible. */
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
  children?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  loading = false,
  disabled,
  type = "button",
  className,
  children,
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading && (
        <TyreLoader size="sm" label={null} className="shrink-0" />
      )}
      {children}
    </button>
  );
}
