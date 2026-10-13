import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

/** The single soft call to action at the end of an article. */
export function FindTyresCta({ className }: { className?: string }) {
  return (
    <aside aria-label="Find your tyres" className={className}>
      <div className="flex flex-col gap-4 rounded-card bg-accent p-5 text-white sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div>
          <p className="type-h3">Ready for new tyres?</p>
          <p className="mt-1 text-white">Search by size, see prices for your suburb, and book a fitting at your door.</p>
        </div>
        <Link href="/tyres" className={buttonClassName({ variant: "black", className: "shrink-0" })}>
          Find your tyres
        </Link>
      </div>
    </aside>
  );
}
