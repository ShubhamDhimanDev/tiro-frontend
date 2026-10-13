import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export type BadgeTone = "neutral" | "accent" | "success" | "action" | "warning" | "danger" | "ink";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-chip text-text",
  accent: "bg-accent text-white",
  success: "bg-success text-white",
  action: "bg-action text-white",
  warning: "bg-accent-soft text-black ring-1 ring-inset ring-accent",
  danger: "bg-black text-accent-light",
  ink: "bg-ink text-white",
};

export function Badge({
  tone = "neutral",
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-control px-2.5 py-0.5 text-xs font-semibold leading-5",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}

export type Tier = "premium" | "mid" | "budget";

const tierMeta: Record<Tier, { label: string; tone: BadgeTone }> = {
  premium: { label: "Premium", tone: "ink" },
  mid: { label: "Mid-range", tone: "action" },
  budget: { label: "Budget", tone: "accent" },
};

/** Tyre tier badge: premium = ink, mid = navy, budget = accent. */
export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  const { label, tone } = tierMeta[tier];
  return (
    <Badge tone={tone} data-tier={tier} className={className}>
      {label}
    </Badge>
  );
}
