"use client";

import { useId, useState } from "react";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { Button } from "@/components/ui/button";

/**
 * "Notify me" capture for a suburb or postcode we don't serve yet. It sits
 * next to the coverage result instead of leaving a dead end: one button opens
 * a short form (first name, email, the area) that posts an `out_of_area`
 * enquiry. Render it OUTSIDE any other `<form>` (forms cannot nest).
 *
 * `query` is what the visitor typed; it prefills the area field only.
 */
export function OutOfAreaCapture({ query, className }: { query: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div data-testid="out-of-area" className={className}>
      <Button
        variant="secondary"
        size="md"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide the form" : "Tell me when you reach my area"}
      </Button>
      <div id={panelId} hidden={!open} className="mt-3 rounded-card border border-line bg-surface p-4">
        {open && (
          <>
            <p className="mb-3 text-sm text-muted">
              Leave your email and we will let you know when we start fitting tyres near {query || "you"}.
            </p>
            <EnquiryForm key={query} type="out_of_area" initial={{ suburb: query }} />
          </>
        )}
      </div>
    </div>
  );
}
