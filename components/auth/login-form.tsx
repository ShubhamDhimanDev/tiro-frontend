"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/auth/client-api";
import type { PublicCustomer } from "@/lib/auth/types";
import { normalizeEmailForDisplay } from "@/lib/auth/normalize-email";
import { useAuth } from "@/components/auth/auth-provider";
import { CountdownButton } from "@/components/auth/countdown-button";
import { FormField, FormError, FormNotice, inputClassName } from "@/components/auth/form-field";
import { PasswordField } from "@/components/auth/password-field";
import { OtpField } from "@/components/auth/otp-field";
import { Button, buttonClassName } from "@/components/ui/button";
import { authErrorMessage } from "@/lib/auth/error-copy";
import { codeError, collectErrors, emailError, passwordError, type FieldErrors } from "@/lib/auth/validate";
import { safeNextPath } from "@/lib/auth/next-path";
import { focusFirstInvalid } from "@/lib/checkout/validate";

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

export function LoginForm({ initialEmail = "", next = "/" }: { initialEmail?: string; next?: string }) {
  const router = useRouter();
  const { setCustomer } = useAuth();
  const [method, setMethod] = useState<Method>("password");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1 rounded-full bg-chip p-1">
        {(["password", "otp"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            aria-pressed={method === m}
            className={`min-h-11 flex-1 rounded-full px-3 text-sm font-semibold transition-colors ${
              method === m ? "bg-black text-white" : "text-muted hover:text-black"
            }`}
          >
            {m === "password" ? "Password" : "Email code"}
          </button>
        ))}
      </div>

      {/* Same minimum height in both modes so the card does not jump when switching tabs. */}
      <div className="min-h-[19rem]">
      {method === "password" ? (
        <PasswordLogin
          initialEmail={initialEmail}
          onSuccess={(customer) => {
            setCustomer(customer);
            router.push(safeNextPath(next));
          }}
        />
      ) : (
        <OtpLogin
          initialEmail={initialEmail}
          onSuccess={(customer) => {
            setCustomer(customer);
            router.push(safeNextPath(next));
          }}
        />
      )}
      </div>

      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="inline-flex min-h-11 items-center font-semibold text-black underline decoration-gold decoration-[3px] underline-offset-4 hover:text-muted">
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = e.currentTarget;
    const errors = collectErrors({ email: emailError(email), password: passwordError(password) });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      window.setTimeout(() => focusFirstInvalid(form), 0);
      return;
    }
    setSubmitting(true);

    const result = await authApi.login(normalizeEmailForDisplay(email), password);
    setSubmitting(false);

    switch (result.kind) {
      case "success":
        onSuccess(result.data.customer);
        return;
      case "invalid_credentials":
        // Deliberately generic — never reveals which case failed (§3a/§7).
        setFormError(authErrorMessage(result));
        return;
      case "rate_limited":
        setFormError(authErrorMessage(result));
        setRetryAfter(result.retryAfter);
        return;
      default:
        setFormError(authErrorMessage(result));
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {formError && <FormError message={formError} />}

      <FormField label="Email" htmlFor="login-email" error={fieldErrors.email?.[0]}>
        <input
          id="login-email"
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

      <PasswordField
        label="Password"
        id="login-password"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        error={fieldErrors.password?.[0]}
      />

      <div className="-mt-2 flex justify-end">
        <Link
          href="/password-reset"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-black underline decoration-gold decoration-[3px] underline-offset-4 hover:text-muted"
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
          appearance="button"
        />
      ) : (
        <Button type="submit" loading={submitting} fullWidth>
          {submitting ? "Logging in…" : "Log in"}
        </Button>
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleRequestSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setUnregistered(false);
    const form = e.currentTarget;
    const errors = collectErrors({ email: emailError(email) });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      window.setTimeout(() => focusFirstInvalid(form), 0);
      return;
    }
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
        setFormError(authErrorMessage(result));
        setRetryAfter(result.retryAfter);
        return;
      default:
        setFormError(authErrorMessage(result));
    }
  }

  async function handleResend() {
    setFormError(null);
    const result = await authApi.otpRequest(normalizeEmailForDisplay(email));
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

  async function handleVerifySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setUnregistered(false);
    const form = e.currentTarget;
    const errors = collectErrors({ code: codeError(code) });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      window.setTimeout(() => focusFirstInvalid(form), 0);
      return;
    }
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
        setFormError(
          result.message && result.message !== "Please check the form and try again."
            ? result.message
            : "That code didn't work. Check the 6 digits, or request a new code if it has expired.",
        );
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
        {unregistered && (
          <Link
            href={`/register?email=${encodeURIComponent(email)}`}
            className={buttonClassName({ fullWidth: true })}
          >
            Create an account with this email
          </Link>
        )}

        <OtpField id="otp-code" value={code} onChange={setCode} error={fieldErrors.code?.[0]} />

        <Button type="submit" loading={submitting} fullWidth>
          {submitting ? "Verifying…" : "Log in"}
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

      <FormField label="Email" htmlFor="otp-email" error={fieldErrors.email?.[0]}>
        <input
          id="otp-email"
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
          label="Send code"
          pendingLabel={(s) => `Try again in ${s}s`}
          type="submit"
          appearance="button"
        />
      ) : (
        <Button type="submit" loading={submitting} fullWidth>
          {submitting ? "Sending code…" : "Send code"}
        </Button>
      )}
    </form>
  );
}
