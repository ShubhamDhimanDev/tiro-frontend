import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";

/**
 * Customer-safe banner for "something upstream failed" (5xx / network):
 * friendly copy, a Retry button and a call-us fallback so a flaky backend is
 * never a dead end. Pass the already-sanitised message from a client-api
 * helper (`friendlyMessage`), never raw server text. Uses the `.msg-error`
 * danger pattern (icon + text + border, never colour alone).
 */
export function ServiceError({
  message = "We couldn't complete that right now. Please try again, or call us.",
  onRetry,
  retrying = false,
  retryLabel = "Try again",
  className = "",
}: {
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div role="alert" className={`msg-error msg-error-box text-sm ${className}`}>
      <div className="flex min-w-0 flex-col gap-3">
      <p>{message}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex min-h-11 items-center rounded-control border-2 border-black bg-surface px-4 font-bold text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {retrying ? "Retrying…" : retryLabel}
          </button>
        )}
        <a href={PHONE_HREF} className="inline-flex min-h-11 items-center font-bold text-black underline underline-offset-2">
          Call us on {PHONE_DISPLAY}
        </a>
      </div>
      </div>
    </div>
  );
}
