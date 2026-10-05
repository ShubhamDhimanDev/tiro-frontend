"use client";

import { useState } from "react";
import { Field, controlClassName } from "@/components/ui/field";
import { cx } from "@/components/ui/cx";

/**
 * Password input with a Show/Hide toggle. The toggle is a plain text button
 * (`aria-pressed`, `aria-controls`) rather than an `aria-label`led icon, so the
 * field's own label stays the only label that names the input.
 */
export function PasswordField({
  label,
  id,
  name,
  value,
  onChange,
  autoComplete,
  error,
  hint,
  minLength,
}: {
  label: string;
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  error?: string;
  hint?: string;
  minLength?: number;
}) {
  const [shown, setShown] = useState(false);

  return (
    <Field label={label} id={id} error={error} hint={hint}>
      {(p) => (
        <div className="relative">
          <input
            {...p}
            name={name}
            type={shown ? "text" : "password"}
            autoComplete={autoComplete}
            autoCapitalize="none"
            spellCheck={false}
            required
            minLength={minLength}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cx(controlClassName, "pr-20")}
          />
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-pressed={shown}
            aria-controls={id}
            className="absolute inset-y-0 right-0 flex min-w-[4.5rem] items-center justify-center rounded-r-control px-3 text-sm font-semibold text-link hover:text-ink"
          >
            <span aria-hidden="true">{shown ? "Hide" : "Show"}</span>
            <span className="sr-only">{shown ? "Hide password" : "Show password"}</span>
          </button>
        </div>
      )}
    </Field>
  );
}
