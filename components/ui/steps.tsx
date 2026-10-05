import { cx } from "./cx";

export type StepState = "done" | "current" | "todo";

export type Step = {
  label: string;
  /** What the user chose for a finished step (shown under the label). */
  value?: string;
  state: StepState;
};

/**
 * Horizontal stepper for short multi-step pickers (vehicle finder). Semantic
 * `<ol>`; the current step carries `aria-current="step"`. Purely presentational:
 * the step content lives elsewhere.
 */
export function Steps({ steps, label, className }: { steps: Step[]; label: string; className?: string }) {
  return (
    <ol aria-label={label} className={cx("grid gap-2", className)} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          data-state={step.state}
          className={cx(
            "flex min-w-0 flex-col gap-1 border-t-4 pt-2 transition-colors duration-300",
            step.state === "done" && "border-ink",
            step.state === "current" && "border-gold",
            step.state === "todo" && "border-line",
          )}
        >
          <span
            className={cx(
              "type-eyebrow font-semibold",
              step.state === "todo" ? "text-muted" : "text-ink",
            )}
          >
            <span className="sr-only">Step </span>
            {index + 1}
            <span className="sr-only">:</span> {step.label}
          </span>
          {step.value && <span className="truncate text-sm font-semibold text-ink">{step.value}</span>}
        </li>
      ))}
    </ol>
  );
}
