"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/auth/client-api";
import { normalizeEmailForDisplay } from "@/lib/auth/normalize-email";
import { useAuth } from "@/components/auth/auth-provider";
import { CountdownButton } from "@/components/auth/countdown-button";
import { FormField, FormError, FormNotice, inputClassName } from "@/components/auth/form-field";
import { PasswordField } from "@/components/auth/password-field";
import { OtpField } from "@/components/auth/otp-field";
import { Button } from "@/components/ui/button";
import { authErrorMessage } from "@/lib/auth/error-copy";
import { codeError, collectErrors, emailError, passwordError } from "@/lib/auth/validate";
import { focusFirstInvalid } from "@/lib/checkout/validate";

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

  async function handleRequestSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = e.currentTarget;
    const errors = collectErrors({ email: emailError(email) });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      window.setTimeout(() => focusFirstInvalid(form), 0);
      return;
    }
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
        setFormError(authErrorMessage(result));
        setRetryAfter(result.retryAfter);
        return;
      default:
        setFormError(authErrorMessage(result));
    }
  }

  async function handleResend() {
    setFormError(null);
    const result = await authApi.passwordResetRequest(normalizeEmailForDisplay(email));
    if (result.kind === "success") {
      setNotice(result.data.message);
      setRetryAfter(DEFAULT_RESEND_COOLDOWN_SECONDS);
    } else if (result.kind === "rate_limited") {
      setFormError(authErrorMessage(result));
      setRetryAfter(result.retryAfter);
    } else {
      setFormError(authErrorMessage(result));
    }
  }

  async function handleResetSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = e.currentTarget;
    const errors = collectErrors({ code: codeError(code), password: passwordError(newPassword, { min: 8 }) });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      window.setTimeout(() => focusFirstInvalid(form), 0);
      return;
    }
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
        setFormError(authErrorMessage(result));
        setFieldErrors(result.errors);
        return;
      case "rate_limited":
        setFormError(authErrorMessage(result));
        setRetryAfter(result.retryAfter);
        return;
      default:
        setFormError(authErrorMessage(result));
    }
  }

  if (step === "reset") {
    return (
      <form onSubmit={handleResetSubmit} noValidate className="flex flex-col gap-4">
        <FormNotice message={notice ?? `If an account exists for ${email}, we've sent a reset code.`} />
        {formError && <FormError message={formError} />}

        <OtpField id="reset-code" value={code} onChange={setCode} error={fieldErrors.code?.[0]} />

        <PasswordField
          label="New password"
          id="new-password"
          name="new_password"
          autoComplete="new-password"
          minLength={8}
          value={newPassword}
          onChange={setNewPassword}
          error={fieldErrors.password?.[0]}
          hint="At least 8 characters."
        />

        <Button type="submit" loading={submitting} fullWidth>
          {submitting ? "Resetting…" : "Reset password and log in"}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setStep("request")}
            className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink"
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
    <form onSubmit={handleRequestSubmit} noValidate className="flex flex-col gap-4">
      {formError && <FormError message={formError} />}

      <FormField label="Email" htmlFor="reset-email" error={fieldErrors.email?.[0]}>
        <input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
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
          appearance="button"
        />
      ) : (
        <Button type="submit" loading={submitting} fullWidth>
          {submitting ? "Sending code…" : "Send reset code"}
        </Button>
      )}

      <p className="text-center text-sm text-muted">
        Remembered your password?{" "}
        <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-black underline decoration-gold decoration-[3px] underline-offset-4 hover:text-muted">
          Log in
        </Link>
      </p>
    </form>
  );
}
