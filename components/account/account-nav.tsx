"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScrollRow } from "@/components/ui/scroll-row";

const LINKS = [
  { href: "/account", label: "Overview", exact: true },
  { href: "/account/orders", label: "Order history" },
  { href: "/account/vehicles", label: "Saved vehicles" },
  { href: "/account/addresses", label: "Saved addresses" },
  { href: "/price-guarantee-claims", label: "Price-match claims" },
] as const;

/**
 * Account sub-nav. Below 1024px: one horizontal, scrollable row of pills (edge
 * fades show when more is off-screen). From 1024px: a vertical list in the
 * left column. The current section is yellow with black text. UI-only, no
 * auth logic (each section gates on `useAuth()` independently).
 */
export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="min-w-0 lg:self-start lg:rounded-card lg:border lg:border-line lg:bg-surface lg:p-2 lg:shadow-rest">
      <ScrollRow className="lg:mx-0 lg:overflow-visible lg:px-0" innerClassName="lg:w-auto lg:flex-col lg:gap-1">
        {LINKS.map((link) => {
          const exact = "exact" in link && link.exact;
          const active = exact ? pathname === link.href : pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-colors lg:rounded-control lg:py-2.5 ${
                active ? "bg-gold text-black" : "bg-chip text-black hover:bg-line/60 lg:bg-transparent"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </ScrollRow>
    </nav>
  );
}
