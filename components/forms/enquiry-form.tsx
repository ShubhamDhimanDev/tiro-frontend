"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { StatePanel } from "@/components/ui/state-panel";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";
import { submitEnquiry, type EnquiryResult } from "@/lib/enquiries/client-api";
import { REGO_STATES, type EnquiryErrors, type EnquiryInput, type EnquiryType } from "@/lib/enquiries/types";
import { firstErrorField, validateEnquiry } from "@/lib/enquiries/validate";

/**
 * One form for every enquiry type (`contact`, `quote`, `fleet`, `out_of_area`).
 * Fields are the ones the API asks for, per type.
 *
 * Accessibility: each field's error is linked with `aria-describedby`
 * (`Field` does the wiring), a summary alert names how many fields need
 * attention, and focus moves to the first invalid field after a failed submit.
 * Success and throttle messages are announced (`role="status"` / `alert`) and
 * focus moves to the success heading.
 *
 * Privacy: values live in component state only. Nothing goes in a URL, in
 * storage or in a log. The honeypot `website` is inert (not focusable, not
 * announced), off-screen, autocomplete off, and always sent empty by people.
 */

export type EnquiryFormProps = {
  type: EnquiryType;
  /** Prefill values that are not personal, e.g. a tyre size from an empty state. */
  initial?: Partial<Record<"tyre_size" | "suburb" | "postcode" | "message", string>>;
  /** Submit button text. */
  submitLabel?: string;
  /** Extra intro copy shown above the fields. */
  className?: string;
  /** Called once with the reference after a successful send. */
  onSent?: (reference: string) => void;
};

const FIELD_ORDER: Record<EnquiryType, readonly string[]> = {
  contact: ["name", "email", "phone", "message"],
  quote: ["name", "email", "phone", "tyre_size", "rego", "rego_state", "suburb", "postcode", "message"],
  fleet: ["name", "email", "phone", "company", "fleet_size", "message"],
  out_of_area: ["name", "email", "suburb", "postcode"],
};

const SUBMIT_LABEL: Record<EnquiryType, string> = {
  contact: "Send message",
  quote: "Request my quote",
  fleet: "Send fleet enquiry",
  out_of_area: "Notify me",
};

type Values = Record<string, string>;

function initialValues(props: EnquiryFormProps): Values {
  return {
    name: "",
    email: "",
    phone: "",
    message: props.initial?.message ?? "",
    tyre_size: props.initial?.tyre_size ?? "",
    rego: "",
    rego_state: "",
    suburb: props.initial?.suburb ?? "",
    postcode: props.initial?.postcode ?? "",
    company: "",
    fleet_size: "",
    website: "",
  };
}

export function EnquiryForm(props: EnquiryFormProps) {
  const { type, submitLabel, className, onSent } = props;
  const uid = useId();
  const successRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<Values>(() => initialValues(props));
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ tone: "error"; text: string } | null>(null);
  const [sent, setSent] = useState<{ reference: string; message: string } | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Throttle countdown: re-enable the button once Retry-After has passed.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);
  const cooling = cooldownUntil > now;

  useEffect(() => {
    if (sent) successRef.current?.focus();
  }, [sent]);

  const id = (field: string) => `${uid}-${field}`;
  const set = (field: string) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if ((errors as Record<string, string | undefined>)[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  function focusFirst(next: EnquiryErrors) {
    const first = firstErrorField(next, FIELD_ORDER[type]);
    if (!first) return;
    // Wait a tick so the error text is in the DOM before focus moves.
    window.setTimeout(() => document.getElementById(id(first))?.focus(), 0);
  }

  function toInput(): EnquiryInput {
    return { type, ...values } as EnquiryInput;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || cooling) return;
    setBanner(null);

    const input = toInput();
    // The out-of-area form has one "suburb or postcode" box: split it by shape.
    if (type === "out_of_area") {
      const raw = values.suburb.trim();
      if (/^\d{4}$/.test(raw)) {
        input.postcode = raw;
        input.suburb = "";
      } else {
        input.postcode = "";
        input.suburb = raw;
      }
    }

    // A filled honeypot skips client validation: it should look like a normal send to a bot.
    if (!input.website) {
      const found = validateEnquiry(input);
      if (Object.keys(found).length > 0) {
        setErrors(found);
        focusFirst(found);
        return;
      }
    }
    setErrors({});
    setBusy(true);
    const result: EnquiryResult = await submitEnquiry(input);
    setBusy(false);

    switch (result.kind) {
      case "success":
        setSent({ reference: result.reference, message: result.message });
        onSent?.(result.reference);
        return;
      case "validation_error": {
        const next = { ...result.errors };
        if (type === "out_of_area" && next.postcode && !next.suburb) next.suburb = next.postcode;
        setErrors(next);
        setBanner({ tone: "error", text: result.message });
        focusFirst(next);
        return;
      }
      case "throttled":
        setCooldownUntil(Date.now() + (result.retryAfter ?? 60) * 1000);
        setNow(Date.now());
        setBanner({ tone: "error", text: result.message });
        return;
      default:
        setBanner({ tone: "error", text: result.message });
    }
  }

  if (sent) {
    return (
      <div ref={successRef} tabIndex={-1} className="outline-none">
      <StatePanel
        tone="success"
        title="Thanks, we've got it"
        testId="enquiry-success"
        className={className}
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              setSent(null);
              setValues(initialValues(props));
            }}
          >
            Send another
          </Button>
        }
      >
        <p>{sent.message}</p>
        <p className="mt-2">
          Your reference is{" "}
          <strong data-testid="enquiry-reference" className="font-mono text-ink">
            {sent.reference}
          </strong>
          . Quote it if you call us on{" "}
          <a href={PHONE_HREF} className="font-semibold text-black underline decoration-gold decoration-[3px] underline-offset-4">
            {PHONE_DISPLAY}
          </a>
          .
        </p>
      </StatePanel>
      </div>
    );
  }

  const errorCount = Object.values(errors).filter(Boolean).length;
  const legalHint = type === "out_of_area" ? "We only use this to tell you when we reach your area." : undefined;

  return (
    <form onSubmit={onSubmit} noValidate aria-label={formLabel(type)} className={`relative ${className ?? ""}`}>
      <div className="flex flex-col gap-4">
        {(errorCount > 0 || banner) && (
          <div role="alert" data-testid="enquiry-alert" className="msg-error msg-error-box text-sm">
            {banner?.text ?? `Please check ${errorCount === 1 ? "the highlighted field" : `the ${errorCount} highlighted fields`}.`}
            {cooling && <span className="mt-1 block font-normal text-muted">You can try again in {Math.max(1, Math.ceil((cooldownUntil - now) / 1000))} seconds.</span>}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id={id("name")}
            label={type === "out_of_area" ? "Your first name" : "Your name"}
            name="name"
            autoComplete="name"
            required
            value={values.name}
            onChange={set("name")}
            error={errors.name}
            maxLength={120}
          />
          <Input
            id={id("email")}
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={values.email}
            onChange={set("email")}
            error={errors.email}
          />
        </div>

        {type !== "out_of_area" && (
          <Input
            id={id("phone")}
            label={type === "contact" ? "Phone (optional)" : "Phone"}
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            required={type === "quote" || type === "fleet"}
            hint={type === "contact" ? undefined : "So we can call you back."}
            value={values.phone}
            onChange={set("phone")}
            error={errors.phone}
          />
        )}

        {type === "fleet" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id={id("company")}
              label="Company"
              name="company"
              autoComplete="organization"
              required
              value={values.company}
              onChange={set("company")}
              error={errors.company}
              maxLength={150}
            />
            <Input
              id={id("fleet_size")}
              label="Fleet size"
              name="fleet_size"
              inputMode="numeric"
              autoComplete="off"
              required
              hint="Roughly how many vehicles."
              value={values.fleet_size}
              onChange={set("fleet_size")}
              error={errors.fleet_size}
            />
          </div>
        )}

        {type === "quote" && (
          <>
            <Input
              id={id("tyre_size")}
              label="Tyre size"
              name="tyre_size"
              autoComplete="off"
              hint="Printed on the sidewall, like 205/55R16. Or give us your number plate below."
              value={values.tyre_size}
              onChange={set("tyre_size")}
              error={errors.tyre_size}
              maxLength={40}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id={id("rego")}
                label="Number plate (optional)"
                name="rego"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={values.rego}
                onChange={set("rego")}
                error={errors.rego}
                maxLength={12}
              />
              <Select id={id("rego_state")} label="Plate state" name="rego_state" value={values.rego_state} onChange={set("rego_state")} error={errors.rego_state}>
                <option value="">Choose a state</option>
                {REGO_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id={id("suburb")}
                label="Suburb (optional)"
                name="suburb"
                autoComplete="address-level2"
                value={values.suburb}
                onChange={set("suburb")}
                error={errors.suburb}
                maxLength={100}
              />
              <Input
                id={id("postcode")}
                label="Postcode (optional)"
                name="postcode"
                autoComplete="postal-code"
                inputMode="numeric"
                value={values.postcode}
                onChange={set("postcode")}
                error={errors.postcode}
                maxLength={4}
              />
            </div>
          </>
        )}

        {type === "out_of_area" && (
          <Input
            id={id("suburb")}
            label="Your suburb or postcode"
            name="suburb"
            autoComplete="postal-code"
            required
            hint={legalHint}
            value={values.suburb}
            onChange={(e) => {
              setValues((v) => ({ ...v, suburb: e.target.value }));
              if (errors.suburb || errors.postcode) setErrors((prev) => ({ ...prev, suburb: undefined, postcode: undefined }));
            }}
            error={errors.suburb ?? errors.postcode}
          />
        )}

        {type !== "out_of_area" && (
          <Textarea
            id={id("message")}
            label={type === "contact" ? "How can we help?" : "Anything else? (optional)"}
            name="message"
            required={type === "contact"}
            rows={type === "contact" ? 5 : 3}
            value={values.message}
            onChange={set("message")}
            error={errors.message}
            maxLength={3000}
          />
        )}

        {/* Honeypot. Inert = unfocusable and hidden from assistive tech; off-screen for sighted users. */}
        <div aria-hidden="true" inert className="pointer-events-none absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
          <label htmlFor={id("website")}>Leave this field empty</label>
          <input
            id={id("website")}
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={set("website")}
            data-testid="enquiry-website"
          />
        </div>

        <Button type="submit" loading={busy} disabled={cooling} fullWidth className="sm:w-fit">
          {busy ? "Sending" : (submitLabel ?? SUBMIT_LABEL[type])}
        </Button>
        <p className="text-sm text-muted">
          We use your details only to answer this enquiry. Prefer to talk? Call{" "}
          <a href={PHONE_HREF} className="font-semibold text-black underline decoration-gold decoration-[3px] underline-offset-4">
            {PHONE_DISPLAY}
          </a>
          .
        </p>
      </div>
    </form>
  );
}

function formLabel(type: EnquiryType): string {
  return { contact: "Contact us", quote: "Request a quote", fleet: "Fleet enquiry", out_of_area: "Notify me when you reach my area" }[type];
}
