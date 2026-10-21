import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export type BadgeTone = "neutral" | "gold" | "success" | "green" | "warning" | "danger" | "ink";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-chip text-text",
  gold: "bg-gold text-black",
  success: "bg-success text-white",
  green: "bg-green text-white",
  warning: "bg-gold-soft text-black ring-1 ring-inset ring-gold",
  danger: "bg-black text-gold",
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
  mid: { label: "Mid-range", tone: "green" },
  budget: { label: "Budget", tone: "gold" },
};

/** Tyre tier badge: premium = ink, mid = green, budget = gold. */
export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  const { label, tone } = tierMeta[tier];
  return (
    <Badge tone={tone} data-tier={tier} className={className}>
      {label}
    </Badge>
  );
}
