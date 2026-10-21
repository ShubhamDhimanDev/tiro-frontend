import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

/**
 * Closing call-to-action for content pages: ONE primary band (shop or book).
 * The secondary row ("Can't find your size? Get a free quote / Call") is the
 * contact bar rendered by the site footer straight after this, so quote and
 * phone actions are not repeated here (WS-B, 2026-10-05: was 3 stacked bands).
 */
export function CtaBands({ className }: { className?: string }) {
  return (
    <section aria-label="Next steps" className={className}>
      <div className="bg-gold text-black">
        <div className="container-page flex flex-col items-start justify-between gap-4 py-6 sm:flex-row sm:items-center sm:py-8">
          <p className="text-balance text-2xl font-extrabold leading-tight tracking-[-0.5px]">Ready for new tyres? We come to you.</p>
          {/* Side by side from 360px (two short labels); stacked only on the smallest phones. */}
          <div className="flex w-full flex-col gap-3 min-[360px]:flex-row sm:w-auto">
            <Link href="/tyres" className={buttonClassName({ variant: "black", className: "w-full min-[360px]:flex-1 sm:w-auto sm:flex-none sm:min-w-[160px]" })}>
              Shop tyres
            </Link>
            <Link href="/booking" className={buttonClassName({ variant: "secondary", className: "w-full min-[360px]:flex-1 sm:w-auto sm:flex-none sm:min-w-[160px]" })}>
              Book a fitting
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
