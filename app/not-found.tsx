import type { Metadata } from "next";
import Link from "next/link";
import { InlineSizeFinder } from "@/components/catalog/inline-size-finder";
import { ImageSlot } from "@/components/page/image-slot";
import { buttonClassName } from "@/components/ui/button";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";

export const metadata: Metadata = {
  title: "Page not found | Tiro Mobile Tyres",
  robots: { index: false, follow: true },
};

const POPULAR = [
  { href: "/tyres", label: "All tyres" },
  { href: "/brands", label: "Brands" },
  { href: "/deals", label: "Offers" },
  { href: "/locations", label: "Where we go" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
];

/** Branded 404: search by size, the main routes back into the site, and a phone number. */
export default function NotFound() {
  return (
    <section aria-labelledby="not-found-heading" className="bg-surface">
      <div className="container-page flex flex-col gap-8 py-12 md:py-16">
        <ImageSlot slot="error-404" rounded={false} className="w-full max-w-sm" />
        <div className="flex max-w-2xl flex-col gap-3">
          <p className="type-eyebrow font-bold uppercase text-muted">Error 404</p>
          <h1 id="not-found-heading" className="type-display">
            This page took a <span className="brand-highlight">wrong turn.</span>
          </h1>
          <p className="text-lg text-muted">
            The page you were after has moved or never existed. Search for your tyre size below, or pick a place to go next.
          </p>
        </div>

        <div className="max-w-3xl rounded-card border border-line bg-surface p-5 shadow-rest md:p-6">
          <InlineSizeFinder />
        </div>

        <div className="flex flex-col gap-3 min-[420px]:flex-row">
          <Link href="/tyres" className={buttonClassName({ variant: "green", className: "w-full min-[420px]:w-auto" })}>
            Search tyres
          </Link>
          <Link href="/booking" className={buttonClassName({ variant: "secondary", className: "w-full min-[420px]:w-auto" })}>
            Book a fitting
          </Link>
          <Link href="/" className={buttonClassName({ variant: "ghost", className: "w-full min-[420px]:w-auto" })}>
            Home
          </Link>
        </div>

        <nav aria-label="Popular pages" className="flex flex-col gap-2">
          <p className="font-bold text-black">Popular pages</p>
          <ul className="flex flex-wrap gap-2">
            {POPULAR.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 text-[15px] font-bold text-black transition-colors hover:bg-black hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-muted">
          Need a hand? Call{" "}
          <a href={PHONE_HREF} className="inline-block py-2 font-bold text-black underline decoration-gold decoration-[3px] underline-offset-4">
            {PHONE_DISPLAY}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
