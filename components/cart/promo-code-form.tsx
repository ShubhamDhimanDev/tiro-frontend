"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { CheckIcon } from "@/components/ui/icons";
import { normalisePromoCode } from "@/lib/cart/cart";
import type { PromoError } from "@/lib/cart/types";

/**
 * Promo code field for the cart summary: type a code and Apply, or Remove an
 * applied one.
 *
 * The server decides whether a code works (`promo_error` on `cart/calculate`
 * is a normal 200, the cart just prices without it), so this only checks that
 * something was typed. States:
 * - no code: field + Apply
 * - code sent, pricing in flight: field disabled, "Applying"
 * - code sent, `promoError` set: the field stays with the API's message under
 *   it (linked with `aria-describedby`, announced) and focus returns to it
 * - code sent and accepted: a labelled chip with Remove
 *
 * `code` is what is stored on the cart; `promoError` is the latest calculation's
 * verdict for it (`null` = accepted, `undefined` = still unknown).
 */
export function PromoCodeForm({
  code,
  pricing,
  promoError,
  onApply,
  onRemove,
}: {
  code: string | undefined;
  pricing: "loading" | "ready" | "error";
  promoError: PromoError | null | undefined;
  onApply: (code: string) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState<string | undefined>();

  const pending = Boolean(code) && pricing === "loading";
  const rejected = Boolean(code) && promoError != null;
  const accepted = Boolean(code) && pricing === "ready" && promoError === null;

  // A rejected code is put back in the field so it can be corrected, and focus goes there.
  const lastRejected = useRef<string | null>(null);
  useEffect(() => {
    if (rejected && code && lastRejected.current !== `${code}:${promoError?.code}`) {
      lastRejected.current = `${code}:${promoError?.code}`;
      queueMicrotask(() => {
        setValue(code);
        inputRef.current?.focus();
      });
    }
    if (!rejected) lastRejected.current = null;
  }, [rejected, code, promoError?.code]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = normalisePromoCode(value);
    if (!next) {
      setLocalError("Enter a promo code.");
      inputRef.current?.focus();
      return;
    }
    setLocalError(undefined);
    onApply(next);
  }

  if (accepted) {
    return (
      <div data-testid="promo-applied" className="flex items-center justify-between gap-3 rounded-control border border-success/40 bg-gold-soft/50 px-3 py-2">
        <p className="flex min-w-0 items-center gap-2 text-sm">
          <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-white">
            <CheckIcon className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 truncate">
            Promo code <strong className="font-mono">{code}</strong> applied
          </span>
        </p>
        <button
          type="button"
          onClick={() => {
            setValue("");
            onRemove();
          }}
          aria-label={`Remove promo code ${code}`}
          className="inline-flex min-h-11 shrink-0 items-center font-semibold text-black underline underline-offset-4 hover:text-ink"
        >
          Remove
        </button>
      </div>
    );
  }

  const error = localError ?? (rejected ? promoError?.message : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <Input
          ref={inputRef}
          id={`${id}-promo`}
          label="Promo code"
          name="promo"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={40}
          disabled={pending}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (localError) setLocalError(undefined);
          }}
          error={error}
          fieldClassName="min-w-0 flex-1"
          className="font-mono uppercase"
        />
        {/* Aligned to the input row: the label sits above, so push the button down by the label height. */}
        <Button type="submit" variant="secondary" loading={pending} className="mt-[1.625rem] shrink-0">
          {pending ? "Applying" : "Apply"}
        </Button>
      </div>
      {rejected && code && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            onRemove();
          }}
          className="inline-flex min-h-11 w-fit items-center font-semibold text-black underline underline-offset-4 hover:text-ink"
        >
          Remove {code}
        </button>
      )}
    </form>
  );
}
