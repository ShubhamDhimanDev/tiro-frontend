"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SizeSelects } from "@/components/catalog/tyre-search-form";
import { Button } from "@/components/ui/button";

/**
 * One-row "find your size" for brand pages and the brands index. Width /
 * profile / rim plus a button; goes to `/tyres?...` (with `brand` when given).
 * Staggered fitments use the full form on `/tyres`.
 */
export function InlineSizeFinder({ brandSlug, className }: { brandSlug?: string; className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [width, setWidth] = useState("");
  const [profile, setProfile] = useState("");
  const [rim, setRim] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!width || !profile || !rim) {
      setError("Select a width, profile and rim.");
      return;
    }
    setError(null);
    const params = new URLSearchParams({ width, profile, rim_diameter: rim });
    if (brandSlug) params.set("brand", brandSlug);
    startTransition(() => router.push(`/tyres?${params.toString()}`));
  }

  return (
    <form onSubmit={submit} className={className} aria-label="Find your size">
      <p className="type-eyebrow mb-2 font-semibold text-muted">Find your size</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 sm:min-w-[18rem]">
          <SizeSelects
            prefix="Size"
            width={width}
            profile={profile}
            rim={rim}
            onChange={(field, value) => {
              if (field === "width") setWidth(value);
              if (field === "profile") setProfile(value);
              if (field === "rim") setRim(value);
            }}
          />
        </div>
        <Button type="submit" loading={isPending} className="sm:shrink-0">
          {isPending ? "Searching" : "Find tyres"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm msg-error">
          {error}
        </p>
      )}
    </form>
  );
}
