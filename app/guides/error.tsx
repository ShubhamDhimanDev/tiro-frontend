"use client";

import { ServiceError } from "@/components/ui/service-error";

/**
 * Error boundary for the guides routes: if rendering ever fails (for example
 * a transient content-API fault), show a friendly message with Retry and the
 * call-us fallback instead of a blank 500.
 */
export default function GuidesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page max-w-xl py-16">
      <h1 className="type-h2 mb-4">We couldn&apos;t load the guides</h1>
      <ServiceError message="We couldn't load this page right now. Please try again, or call us." onRetry={reset} />
    </div>
  );
}
