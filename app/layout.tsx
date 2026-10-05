import type { Metadata } from "next";
import "./globals.css";
import { Montserrat } from "next/font/google";
import { NavProgress } from "@/components/layout/nav-progress";
import { ToastProvider } from "@/components/ui/toast";
import { MotionProvider } from "@/components/motion/motion-provider";
import { AuthProvider } from "@/components/auth/auth-provider";
import { LocationProvider } from "@/components/location/location-provider";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartDrawerProvider } from "@/components/cart/cart-drawer";
import { SocialProofToast } from "@/components/ui/social-proof-toast";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SITE_NAME } from "@/lib/site/config";
import { SITE_URL } from "@/lib/site/url";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Tiro Mobile Tyres",
  description: "Mobile tyre fitting. We come to you. Search by size, browse by brand, and book a fitting.",
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, locale: "en_AU", type: "website" },
  twitter: { card: "summary_large_image" },
};

/**
 * Montserrat (variable, 400-800) is the only typeface (design v2). The
 * `--font-montserrat` variable is mapped to `font-sans`/`font-display`/
 * `font-mono` in app/globals.css's `@theme inline` block.
 */
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

// Deliberately NOT reading the session/zone cookies here (no `cookies()`
// call in this file). `cacheComponents` is off (next.config.ts), so any
// dynamic-API read in the root layout would force every route that shares it
// into per-request SSR, including the SSG/ISR pages that are the reason this
// is Next.js. `<AuthProvider>`, `<LocationProvider>` and `<CartProvider>`
// hydrate client-side after mount instead.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${montserrat.variable}`}>
      <body className="flex min-h-full flex-col overflow-x-clip bg-tarmac text-text">
        <MotionProvider>
        <NavProgress />
        <ToastProvider>
        <LocationProvider>
          <AuthProvider>
            <CartProvider>
              <CartDrawerProvider>
                <a
                  href="#page-content"
                  className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-control focus:bg-black focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
                >
                  Skip to content
                </a>
                <SiteHeader />
                {/* The one `<main>` landmark for the whole site (pages must not
                    render their own `<main>`). The skip link targets its id. */}
                <main id="page-content" tabIndex={-1} className="flex-1 overflow-x-clip outline-none">
                  {children}
                </main>
                <SiteFooter />
                <SocialProofToast />
              </CartDrawerProvider>
            </CartProvider>
          </AuthProvider>
        </LocationProvider>
        </ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
