import { cloneElement, isValidElement } from "react";

/**
 * Shared form primitives used across every domain's forms (auth, location
 * capture, tyre-size search, checkout, account, price-guarantee...).
 * Originally lived only in `components/auth/`; moved here since it's
 * genuinely generic — `components/auth/form-field.tsx` re-exports from here
 * so existing auth imports keep working unchanged.
 *
 * Phase 0 (redesign): class strings now use the new tokens (line,
 * surface, ink). Inputs are 48px / 16px text; the global gold focus ring in
 * globals.css applies (no per-input focus overrides). New code should prefer
 * the primitives in this folder: button.tsx, field.tsx (Input/Select/Field).
 *
 * Real-brand design system: these are the highest-leverage styling
 * primitives in the app (imported by ~30 form-bearing components across
 * auth/checkout/cart/account/vehicles/location/price-guarantee/catalog) —
 * updating the shared class strings here is what carries the new design
 * tokens into every one of those without a bespoke pass on each file.
 *
 * Buttons are full-pill (`rounded-full`) per every real campaign ad's CTA
 * shape; inputs/notices stay on the softer `rounded-md` (10px) card/input
 * radius — pill radius is reserved for buttons and icon badges, not form
 * fields (an input styled as a pill reads like a search box, not a text
 * field). Errors use the black `.msg-error` pattern (icon + thick left border), never colour alone.
 */

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  const describedBy = [error ? errorId : null, hint && !error ? hintId : null].filter(Boolean).join(" ") || undefined;

  // Wire the control to its error/hint text without every call site having to:
  // when the single child is an element, add `aria-invalid` and merge
  // `aria-describedby` (keeping any value the caller already set).
  const control =
    isValidElement<{ "aria-describedby"?: string; "aria-invalid"?: boolean }>(children) && describedBy
      ? cloneElement(children, {
          "aria-invalid": error ? true : children.props["aria-invalid"],
          "aria-describedby": [children.props["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined,
        })
      : children;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm msg-error">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClassName =
  "w-full min-h-12 rounded-control border border-field bg-surface px-3.5 py-2.5 text-base text-black placeholder:text-[#757575] transition-colors duration-150 hover:border-black disabled:cursor-not-allowed disabled:border-disabled-border disabled:bg-disabled-bg disabled:text-disabled-text focus-visible:border-black aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger";

export const selectClassName = inputClassName;

export const primaryButtonClassName =
  "w-full min-h-12 rounded-control bg-green px-5 py-2.5 text-[15px] font-bold text-white transition-colors duration-300 hover:bg-green-hover disabled:cursor-not-allowed disabled:border-2 disabled:border-dashed disabled:border-disabled-border disabled:bg-disabled-bg disabled:text-disabled-text";

// Deliberately no `min-h-11` on the base string (unlike `primaryButtonClassName`
// below) — every list-row call site (saved-vehicles/addresses, order rows)
// overrides padding/text-size down to a compact `px-3 py-1.5 text-xs` chip,
// and Tailwind's generated stylesheet order (source-scan order, not
// call-site string-concatenation order) doesn't reliably let a later class
// win a cascade tie against an earlier-defined `min-h-*` from this shared
// string — baking a forced 44px floor in here would risk overriding those
// call sites' intentional compact sizing instead of the reverse. Full-size
// standalone secondary buttons (no override) are still comfortably touch-sized
// at `py-2.5` (≈44px with text) without needing an explicit floor.
export const secondaryButtonClassName =
  "w-full rounded-control border-2 border-black bg-surface px-5 py-2.5 text-[15px] font-bold text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60";

export function FormError({ message }: { message: string }) {
  return (
    <div role="alert" className="msg-error msg-error-box text-sm">
      {message}
    </div>
  );
}

export function FormNotice({ message }: { message: string }) {
  return (
    <div role="status" className="rounded-control border border-line bg-chip px-3.5 py-3 text-sm text-ink">
      {message}
    </div>
  );
}
