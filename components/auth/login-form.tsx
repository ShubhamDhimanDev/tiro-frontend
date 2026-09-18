"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/auth/client-api";
import type { PublicCustomer } from "@/lib/auth/types";
import { normalizeEmailForDisplay } from "@/lib/auth/normalize-email";
import { useAuth } from "@/components/auth/auth-provider";
import { CountdownButton } from "@/components/auth/countdown-button";
import { FormField, FormError, FormNotice, inputClassName, primaryButtonClassName } from "@/components/auth/form-field";

/**
 * Password and OTP are two equal, independent, permanent login methods —
 * customer's choice every time, not a primary/fallback pairing
 * (docs/architecture/08-customer-auth-otp.md §3). Rendered as two tabs
 * rather than one form that infers a method, so neither reads as the
 * "real" one.
 *
 * A default `retry_after`-shaped guess of 60s (the documented resend
 * cooldown, §6) is applied client-side after a successful OTP send purely
 * for the resend button's UX — the server's 200 response has no
 * `retry_after` field to read (only 429s carry it); the authoritative value
 * always wins the moment a real 429 arrives.
 */

const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;

type Method = "password" | "otp";

export function LoginForm({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const { setCustomer } = useAuth();
  const [method, setMethod] = useState<Method>("password");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex rounded-md border border-zinc-200 p-1 dark:border-zinc-800">
        {(["password", "otp"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            aria-pressed={method === m}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              method === m
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            {m === "password" ? "Password" : "Email code"}
          </button>
        ))}
      </div>

      {method === "password" ? (
        <PasswordLogin
          initialEmail={initialEmail}
          onSuccess={(customer) => {
            setCustomer(customer);
            router.push("/");
          }}
        />
      ) : (
        <OtpLogin
          initialEmail={initialEmail}
          onSuccess={(customer) => {
            setCustomer(customer);
            router.push("/");
          }}
        />
      )}

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        New here?{" "}
        <Link href="/register" className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-50">
          Create an account
        </Link>
      </p>
    </div>
  );
}

function PasswordLogin({
  initialEmail,
  onSuccess,
}: {
  initialEmail: string;
  onSuccess: (customer: PublicCustomer) => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const result = await authApi.login(normalizeEmailForDisplay(email), password);
    setSubmitting(false);

    switch (result.kind) {
      case "success":
        onSuccess(result.data.customer);
        return;
      case "invalid_credentials":
        // Deliberately generic — never reveals which case failed (§3a/§7).
        setFormError(result.message);
        return;
      case "rate_limited":
        setFormError(result.message);
        setRetryAfter(result.retryAfter);
        return;
      default:
        setFormError(result.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {formError && <FormError message={formError} />}

      <FormField label="Email" htmlFor="login-email">
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      <FormField label="Password" htmlFor="login-password">
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      <div className="flex justify-end">
        <Link
          href="/password-reset"
          className="text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Forgot password?
        </Link>
      </div>

      {retryAfter > 0 ? (
        <CountdownButton
          seconds={retryAfter}
          onExpire={() => setRetryAfter(0)}
          label="Log in"
          pendingLabel={(s) => `Try again in ${s}s`}
          type="submit"
        />
      ) : (
        <button type="submit" disabled={submitting} className={primaryButtonClassName}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      )}
    </form>
  );
}

function OtpLogin({
  initialEmail,
  onSuccess,
}: {
  initialEmail: string;
  onSuccess: (customer: PublicCustomer) => void;
}) {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState(0);
  const [unregistered, setUnregistered] = useState(false);

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setUnregistered(false);
    setSubmitting(true);

    const result = await authApi.otpRequest(normalizeEmailForDisplay(email));
    setSubmitting(false);

    switch (result.kind) {
      case "success":
        setNotice(result.data.message);
        setRetryAfter(DEFAULT_RESEND_COOLDOWN_SECONDS);
        setStep("verify");
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
    const result = await authApi.otpRequest(normalizeEmailForDisplay(email));
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

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setUnregistered(false);
    setSubmitting(true);

    const result = await authApi.otpVerify(normalizeEmailForDisplay(email), code);
    setSubmitting(false);

    switch (result.kind) {
      case "success":
        onSuccess(result.data.customer);
        return;
      case "not_found":
        // The one deliberately specific failure in this whole flow: the
        // customer just proved inbox ownership by entering a correct code,
        // so telling them "no account yet" here doesn't leak anything they
        // don't already effectively know (§3b/§12).
        setUnregistered(true);
        setFormError(result.message);
        return;
      case "validation_error":
        setFormError(result.message);
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
        {unregistered && (
          <Link
            href={`/register?email=${encodeURIComponent(email)}`}
            className={`${primaryButtonClassName} block text-center`}
          >
            Create an account with this email
          </Link>
        )}

        <FormField label="Verification code" htmlFor="otp-code">
          <input
            id="otp-code"
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
          {submitting ? "Verifying…" : "Log in"}
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

      <FormField label="Email" htmlFor="otp-email">
        <input
          id="otp-email"
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
          label="Send code"
          pendingLabel={(s) => `Try again in ${s}s`}
          type="submit"
        />
      ) : (
        <button type="submit" disabled={submitting} className={primaryButtonClassName}>
          {submitting ? "Sending code…" : "Send code"}
        </button>
      )}
    </form>
  );
}
