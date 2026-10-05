"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { TyreIcon } from "@/components/ui/icons";
import { subscribeNewsletter } from "@/lib/newsletter/client-api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Newsletter card: the site's single signup surface. Posts to this app's
 * `/api/newsletter`, which proxies `POST /newsletter-subscriptions`. Consent is
 * explicit (the visitor submits the form; nothing is pre-ticked). The honeypot
 * `website` field is inert, off-screen and always sent empty by people.
 */
export function Newsletter() {
  const uid = useId();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBanner(null);
    if (!website && !EMAIL.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError(undefined);
    setBusy(true);
    const result = await subscribeNewsletter({ email: email.trim(), first_name: firstName.trim() || undefined, source: "home", website });
    setBusy(false);
    if (result.kind === "success") setDone(result.message);
    else if (result.kind === "validation_error") setError(result.message);
    else setBanner(result.message);
  }

  return (
    <section aria-labelledby="newsletter-heading" className="container-page pt-[50px] lg:pt-20">
      <div className="grid overflow-hidden rounded-card bg-band md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div aria-hidden="true" className="asphalt-texture flex min-h-[200px] items-center justify-center md:min-h-[360px]">
          <TyreIcon className="h-28 w-28 text-gold" strokeWidth={1.2} />
        </div>
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <h2 id="newsletter-heading" className="type-h2">
            Tyre news, delivered like our service
          </h2>
          <p className="text-[15px] text-muted">Expert tyre advice, member-only offers and updates on new locations near you.</p>
          {done ? (
            <p role="status" data-testid="newsletter-success" className="rounded-control bg-surface p-4 text-[15px] font-bold text-black">
              {done}
            </p>
          ) : (
            <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-3">
              <Input label="First name (optional)" name="first_name" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <Input
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(undefined);
                }}
                error={error}
              />
              <div aria-hidden="true" inert className="pointer-events-none absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
                <label htmlFor={`${uid}-website`}>Leave this field empty</label>
                <input
                  id={`${uid}-website`}
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
              {banner && (
                <p role="alert" className="text-sm msg-error">
                  {banner}
                </p>
              )}
              <Button type="submit" variant="green" fullWidth loading={busy}>
                {busy ? "Subscribing" : "Subscribe"}
              </Button>
              <p className="text-xs text-muted">We only email you if you subscribe. Unsubscribe any time.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
