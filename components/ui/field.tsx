import { useId } from "react";
import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "./cx";

export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
};

type FieldShellProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Override the generated control id. */
  id?: string;
};

/**
 * Label + control + hint + error, with ids and aria wired up. `children` is a
 * render function receiving the props the control must spread.
 */
export function Field({
  label,
  hint,
  error,
  required,
  id,
  className,
  children,
}: FieldShellProps & { className?: string; children: (props: FieldControlProps) => ReactNode }) {
  const autoId = useId();
  const controlId = id ?? `field-${autoId}`;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy = [error ? errorId : null, hint && !error ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={controlId} className="text-sm font-bold text-black">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-black">
            *
          </span>
        )}
      </label>
      {children({
        id: controlId,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        "aria-required": required ? true : undefined,
      })}
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

/** 48px control, 16px text (avoids iOS focus zoom), 8px radius. */
export const controlClassName =
  "block w-full min-h-12 rounded-control border border-field bg-surface px-3.5 py-2.5 text-base text-black placeholder:text-[#757575] transition-colors duration-150 hover:border-black disabled:cursor-not-allowed disabled:border-disabled-border disabled:bg-disabled-bg disabled:text-disabled-text focus-visible:border-black aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger";

export function Input({
  label,
  hint,
  error,
  required,
  id,
  fieldClassName,
  className,
  ref,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "id"> &
  FieldShellProps & { fieldClassName?: string; ref?: Ref<HTMLInputElement> }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id} className={fieldClassName}>
      {(p) => <input ref={ref} required={required} className={cx(controlClassName, className)} {...p} {...rest} />}
    </Field>
  );
}

export function Select({
  label,
  hint,
  error,
  required,
  id,
  fieldClassName,
  className,
  ref,
  children,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> &
  FieldShellProps & { fieldClassName?: string; ref?: Ref<HTMLSelectElement> }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id} className={fieldClassName}>
      {(p) => (
        <select ref={ref} required={required} className={cx(controlClassName, className)} {...p} {...rest}>
          {children}
        </select>
      )}
    </Field>
  );
}

export function Textarea({
  label,
  hint,
  error,
  required,
  id,
  fieldClassName,
  className,
  ref,
  ...rest
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> &
  FieldShellProps & { fieldClassName?: string; ref?: Ref<HTMLTextAreaElement> }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id} className={fieldClassName}>
      {(p) => (
        <textarea ref={ref} required={required} className={cx(controlClassName, "min-h-28", className)} {...p} {...rest} />
      )}
    </Field>
  );
}
