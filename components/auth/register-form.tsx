"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/auth/client-api";
import { normalizeEmailForDisplay } from "@/lib/auth/normalize-email";
import { useAuth } from "@/components/auth/auth-provider";
import { CountdownButton } from "@/components/auth/countdown-button";
import { FormField, FormError, FormNotice, inputClassName, primaryButtonClassName } from "@/components/auth/form-field";

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

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
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

  async function handleResend() {
    setFormError(null);
    const normalized = normalizeEmailForDisplay(email);
    const result = await authApi.register(normalized, password);
    if (result.kind === "success") {
      setNotice(result.data.message);
    } else if (result.kind === "rate_limited") {
      setFormError(result.message);
      setRetryAfter(result.retryAfter);
    } else if (result.kind === "validation_error") {
      setFormError(result.message);
    } else {
      setFormError(result.message);
    }
  }

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
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

  if (step === "verify") {
    return (
      <form onSubmit={handleVerifySubmit} className="flex flex-col gap-4">
        <FormNotice message={notice ?? `We've sent a 6-digit code to ${email}.`} />
        {formError && <FormError message={formError} />}

        <FormField label="Verification code" htmlFor="code" error={fieldErrors.code?.[0]}>
          <input
            id="code"
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

        <button type="submit" disabled={submitting} className={primaryButtonClassName}>
          {submitting ? "Verifying…" : "Verify and create account"}
        </button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setStep("credentials")}
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
    <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4">
      {formError && <FormError message={formError} />}

      <FormField label="Email" htmlFor="email" error={fieldErrors.email?.[0]}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      <FormField
        label="Password"
        htmlFor="password"
        error={fieldErrors.password?.[0]}
        hint="At least 8 characters."
      >
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      {retryAfter > 0 ? (
        <CountdownButton
          seconds={retryAfter}
          onExpire={() => setRetryAfter(0)}
          label="Create account"
          pendingLabel={(s) => `Try again in ${s}s`}
          type="submit"
        />
      ) : (
        <button type="submit" disabled={submitting} className={primaryButtonClassName}>
          {submitting ? "Sending code…" : "Create account"}
        </button>
      )}

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-50">
          Log in
        </Link>
      </p>
    </form>
  );
}
