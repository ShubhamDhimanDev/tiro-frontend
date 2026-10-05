"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ImageSlot } from "@/components/page/image-slot";
import { FormNotice } from "@/components/ui/form-field";
import { buttonClassName } from "@/components/ui/button";
import type { ContentImageKey } from "@/lib/site/content-images";
import { loginHref } from "@/lib/auth/next-path";

/** Loading placeholder for account lists and forms (same footprint as a card row). */
export function ListSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-card bg-chip" />
      ))}
    </div>
  );
}

/** Signed-out prompt: what is gated, and one action. */
export function SignInPrompt({ message }: { message: string }) {
  const href = loginHref(usePathname());
  return (
    <div className="flex flex-col items-start gap-4 rounded-card border border-line bg-surface p-5 shadow-rest md:p-6">
      <FormNotice message={message} />
      <div className="flex flex-wrap gap-3">
        <Link href={href} className={buttonClassName()}>
          Log in
        </Link>
        <Link href="/register" className={buttonClassName({ variant: "secondary" })}>
          Create an account
        </Link>
      </div>
    </div>
  );
}

/** Empty list: a placeholder picture (optional), one sentence, one action. */
export function EmptyState({ title, action, image }: { title: string; action: ReactNode; image?: ContentImageKey }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-card border border-dashed border-field bg-surface p-6 sm:flex-row sm:items-center sm:gap-6">
      {image && <ImageSlot slot={image} className="w-24 shrink-0 sm:w-28" />}
      <div className="flex flex-col items-start gap-4">
        <p className="text-lg font-bold text-ink">{title}</p>
        {action}
      </div>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="msg-error msg-error-box text-sm">
      {message}
    </p>
  );
}
