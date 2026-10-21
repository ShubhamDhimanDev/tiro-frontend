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

/**
 * Registration is a two-step, bundled flow (password up front, OTP
 * verification gates activation) — docs/architecture/08-customer-auth-otp.md
 * §2. This also doubles as the guest-order-history-claim entry point: a
 * customer who checked out as a guest lands here to activate that same
 * email address, at which point their prior order history becomes visible
 * (§10) — there is no separate "claim" flow to build, registering the
 * email *is* claiming it.
 */
export function RegisterForm({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const { setCustomer } = useAuth();

  const [step, setStep] = useState<"credentials" | "verify">("credentials");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [retryAfter, setRetryAfter] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleCredentialsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = e.currentTarget;
    const errors = collectErrors({ email: emailError(email), password: passwordError(password, { min: 8 }) });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      window.setTimeout(() => focusFirstInvalid(form), 0);
      return;
    }
    setSubmitting(true);

    const normalized = normalizeEmailForDisplay(email);
    const result = await authApi.register(normalized, password);
    setSubmitting(false);

    switch (result.kind) {
      case "success":
        setNotice(result.data.message);
        setStep("verify");
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

  async function handleResend() {
    setFormError(null);
    const normalized = normalizeEmailForDisplay(email);
    const result = await authApi.register(normalized, password);
    if (result.kind === "success") {
      setNotice(result.data.message);
    } else if (result.kind === "rate_limited") {
      setFormError(authErrorMessage(result));
      setRetryAfter(result.retryAfter);
    } else {
      setFormError(authErrorMessage(result));
    }
  }

  async function handleVerifySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = e.currentTarget;
    const errors = collectErrors({ code: codeError(code) });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      window.setTimeout(() => focusFirstInvalid(form), 0);
      return;
    }
    setSubmitting(true);

    const normalized = normalizeEmailForDisplay(email);
    const result = await authApi.registerVerify(normalized, code);
    setSubmitting(false);

    switch (result.kind) {
      case "success":
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

  if (step === "verify") {
    return (
      <form onSubmit={handleVerifySubmit} noValidate className="flex flex-col gap-4">
        <FormNotice message={notice ?? `We've sent a 6-digit code to ${email}.`} />
        {formError && <FormError message={formError} />}

        <OtpField id="code" value={code} onChange={setCode} error={fieldErrors.code?.[0]} />

        <Button type="submit" loading={submitting} fullWidth>
          {submitting ? "Verifying…" : "Verify and create account"}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setStep("credentials")}
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
    <form onSubmit={handleCredentialsSubmit} noValidate className="flex flex-col gap-4">
      {formError && <FormError message={formError} />}

      <FormField label="Email" htmlFor="email" error={fieldErrors.email?.[0]}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      <PasswordField
        label="Password"
        id="password"
        name="password"
        autoComplete="new-password"
        minLength={8}
        value={password}
        onChange={setPassword}
        error={fieldErrors.password?.[0]}
        hint="At least 8 characters."
      />

      {retryAfter > 0 ? (
        <CountdownButton
          seconds={retryAfter}
          onExpire={() => setRetryAfter(0)}
          label="Create account"
          pendingLabel={(s) => `Try again in ${s}s`}
          type="submit"
          appearance="button"
        />
      ) : (
        <Button type="submit" loading={submitting} fullWidth>
          {submitting ? "Sending code…" : "Create account"}
        </Button>
      )}

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-black underline decoration-gold decoration-[3px] underline-offset-4 hover:text-muted">
          Log in
        </Link>
      </p>
    </form>
  );
}
