import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

/** The single soft call to action at the end of an article. */
export function FindTyresCta({ className }: { className?: string }) {
  return (
    <aside aria-label="Find your tyres" className={className}>
      <div className="flex flex-col gap-4 rounded-card bg-gold p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div>
          <p className="type-h3">Ready for new tyres?</p>
          <p className="mt-1 text-black/80">Search by size, see prices for your suburb, and book a fitting at your door.</p>
        </div>
        <Link href="/tyres" className={buttonClassName({ variant: "black", className: "shrink-0" })}>
          Find your tyres
        </Link>
      </div>
    </aside>
  );
}
