import type { ReactNode } from "react";
import { cx } from "./cx";
import { AlertIcon, CheckIcon, ClockIcon } from "./icons";

export type StateTone = "info" | "success" | "warning" | "error";

const TONE: Record<StateTone, { border: string; badge: string }> = {
  info: { border: "border-line", badge: "bg-ink text-white" },
  success: { border: "border-success", badge: "bg-success text-white" },
  warning: { border: "border-gold", badge: "bg-gold text-black" },
  error: { border: "border-black", badge: "bg-black text-gold" },
};

/**
 * A titled status card with an icon, used for the empty/error/pending/success
 * states across the purchase path. `role="alert"` for errors, `status` for the
 * rest, unless overridden.
 */
export function StatePanel({
  tone = "info",
  title,
  children,
  actions,
  icon,
  role,
  testId,
  className,
}: {
  tone?: StateTone;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  role?: "alert" | "status";
  testId?: string;
  className?: string;
}) {
  const t = TONE[tone];
  const defaultIcon =
    tone === "success" ? <CheckIcon className="h-5 w-5" /> : tone === "info" ? <ClockIcon className="h-5 w-5" /> : <AlertIcon className="h-5 w-5" />;
  return (
    <div
      role={role ?? (tone === "error" ? "alert" : "status")}
      data-testid={testId}
      className={cx("state-enter flex flex-col gap-4 rounded-card border-2 bg-surface p-4 shadow-rest md:p-6", tone === "error" && "shake-once", t.border, className)}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={cx("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", tone === "success" && "badge-pop", t.badge)}>
          {icon ?? defaultIcon}
        </span>
        <div className="min-w-0">
          <h2 className="type-h3">{title}</h2>
          {children && <div className="mt-1 text-muted">{children}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">{actions}</div>}
    </div>
  );
}
