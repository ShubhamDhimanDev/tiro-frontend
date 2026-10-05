"use client";

import { FormField, inputClassName } from "@/components/auth/form-field";
import { cx } from "@/components/ui/cx";

/**
 * One-time-code input: numeric keypad on phones, `one-time-code` autofill from
 * SMS/email suggestions, digits only, six characters, spaced for legibility.
 */
export function OtpField({
  id,
  value,
  onChange,
  error,
  label = "Verification code",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
}) {
  return (
    <FormField label={label} htmlFor={id} error={error} hint="The 6 digits from the email we just sent.">
      <input
        id={id}
        name="code"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        autoCapitalize="none"
        spellCheck={false}
        required
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className={cx(inputClassName, "text-center font-mono text-2xl tracking-[0.4em]")}
      />
    </FormField>
  );
}
