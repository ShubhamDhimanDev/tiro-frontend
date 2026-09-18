import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AuthStatus } from "@/components/auth/auth-status";
import { LocationProvider } from "@/components/location/location-provider";
import { LocationBadge } from "@/components/location/location-badge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tiro Mobile Tyres",
  description: "Mobile tyre fitting — we come to you. Search by size, browse by brand, and book a fitting.",
};

// Deliberately NOT reading the session/zone cookies here (no `cookies()`
// call in this file). This project's `cacheComponents` flag is off
// (next.config.ts), so under the classic rendering model any dynamic-API
// read in the root layout would force *every* route that shares it into
// per-request SSR — including the SSG/ISR brand/browse/PDP pages that are
// the whole reason this is Next.js. `<AuthProvider>` and `<LocationProvider>`
// instead hydrate client-side after mount (see components/auth/auth-provider.tsx
// and components/location/location-provider.tsx) so this layout, and
// therefore every static page under it, stays static.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocationProvider>
          <AuthProvider>
            <header className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
              <nav className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                <Link href="/" className="font-semibold text-zinc-900 dark:text-zinc-50">
                  Tiro Mobile Tyres
                </Link>
                <Link href="/tyres" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                  Shop tyres
                </Link>
                <Link href="/tyres/by-vehicle" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                  Find by vehicle
                </Link>
                <Link href="/brands" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                  Brands
                </Link>
              </nav>
              <div className="flex items-center gap-4">
                <LocationBadge />
                <AuthStatus />
              </div>
            </header>
            {children}
          </AuthProvider>
        </LocationProvider>
      </body>
    </html>
  );
}
