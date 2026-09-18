"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/auth/client-api";
import { normalizeEmailForDisplay } from "@/lib/auth/normalize-email";
import { useAuth } from "@/components/auth/auth-provider";
import { CountdownButton } from "@/components/auth/countdown-button";
import { FormField, FormError, FormNotice, inputClassName, primaryButtonClassName } from "@/components/auth/form-field";

const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;

/**
 * Request-code step, then a single combined code + new-password step —
 * unlike registration, there's no separate "stage the password" step here;
 * the new password is submitted together with the code
 * (docs/architecture/08-customer-auth-otp.md §4).
 */
export function PasswordResetForm({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const { setCustomer } = useAuth();

  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [retryAfter, setRetryAfter] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const result = await authApi.passwordResetRequest(normalizeEmailForDisplay(email));
    setSubmitting(false);

    switch (result.kind) {
      case "success":
        // Always generic, whether or not the email exists (§4) — the UI
        // must not treat this differently based on account existence.
        setNotice(result.data.message);
        setRetryAfter(DEFAULT_RESEND_COOLDOWN_SECONDS);
        setStep("reset");
        return;
      case "rate_limited":
        setFormError(result.message);
        setRetryAfter(result.retryAfter);
        return;
      default:
        setFormError(result.message);
    }
  }

  async function handleResend() {
    setFormError(null);
    const result = await authApi.passwordResetRequest(normalizeEmailForDisplay(email));
    if (result.kind === "success") {
      setNotice(result.data.message);
      setRetryAfter(DEFAULT_RESEND_COOLDOWN_SECONDS);
    } else if (result.kind === "rate_limited") {
      setFormError(result.message);
      setRetryAfter(result.retryAfter);
    } else {
      setFormError(result.message);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);

    const result = await authApi.passwordResetVerify(normalizeEmailForDisplay(email), code, newPassword);
    setSubmitting(false);

    switch (result.kind) {
      case "success":
        // Reset issues a fresh token immediately (§4) — the customer lands
        // signed in rather than being bounced to a second login step.
        setCustomer(result.data.customer);
        router.push("/");
        return;
      case "validation_error":
        setFormError(result.message);
        setFieldErrors(result.errors);
        return;
      case "rate_limited":
        setFormError(result.message);
        setRetryAfter(result.retryAfter);
        return;
      default:
        setFormError(result.message);
    }
  }

  if (step === "reset") {
    return (
      <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
        <FormNotice message={notice ?? `If an account exists for ${email}, we've sent a reset code.`} />
        {formError && <FormError message={formError} />}

        <FormField label="Verification code" htmlFor="reset-code" error={fieldErrors.code?.[0]}>
          <input
            id="reset-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClassName}
          />
        </FormField>

        <FormField
          label="New password"
          htmlFor="new-password"
          error={fieldErrors.password?.[0]}
          hint="At least 8 characters."
        >
          <input
            id="new-password"
            name="new_password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClassName}
          />
        </FormField>

        <button type="submit" disabled={submitting} className={primaryButtonClassName}>
          {submitting ? "Resetting…" : "Reset password and log in"}
        </button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setStep("request")}
            className="text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Use a different email
          </button>
          <CountdownButton
            seconds={retryAfter}
            onExpire={() => setRetryAfter(0)}
            label="Resend code"
            pendingLabel={(s) => `Resend code in ${s}s`}
            onClick={handleResend}
          />
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
      {formError && <FormError message={formError} />}

      <FormField label="Email" htmlFor="reset-email">
        <input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      {retryAfter > 0 ? (
        <CountdownButton
          seconds={retryAfter}
          onExpire={() => setRetryAfter(0)}
          label="Send reset code"
          pendingLabel={(s) => `Try again in ${s}s`}
          type="submit"
        />
      ) : (
        <button type="submit" disabled={submitting} className={primaryButtonClassName}>
          {submitting ? "Sending code…" : "Send reset code"}
        </button>
      )}

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Remembered your password?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-50">
          Log in
        </Link>
      </p>
    </form>
  );
}
