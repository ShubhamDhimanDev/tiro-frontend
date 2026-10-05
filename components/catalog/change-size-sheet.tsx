"use client";

import { useState } from "react";
import { TyreSearchForm, type TyreSearchFormValues } from "@/components/catalog/tyre-search-form";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { SearchIcon } from "@/components/ui/icons";
import { cx } from "@/components/ui/cx";

/**
 * "Change size" trigger + a sheet holding the full size search form (including
 * the staggered front/rear option). Render it with a `key` derived from the
 * current search so the sheet remounts closed when the new results arrive.
 */
export function ChangeSizeSheet({
  values,
  variant = "chip",
  label = "Change size",
  className,
}: {
  values: TyreSearchFormValues;
  variant?: "chip" | "button";
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "chip" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={cx(
            "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-chip",
            className,
          )}
        >
          <SearchIcon className="h-4 w-4" />
          {label}
        </button>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)} aria-haspopup="dialog" className={className}>
          {label}
        </Button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="Change tyre size" desktop="dialog">
        <TyreSearchForm initial={values} />
      </Sheet>
    </>
  );
}
