import type { Metadata } from "next";
import { AccountShell } from "@/components/account/account-shell";

/**
 * Shell for every `/account/*` page — nav furniture only, no auth logic of
 * its own. Personalized/account-only, same `robots: {index:false}` posture
 * as `app/price-guarantee-claims/page.tsx`/`app/orders/[order]/page.tsx`
 * (set here once for the whole subtree rather than duplicated per page).
 *
 * Deliberately no `cookies()`/session read here — same "keep dynamic reads
 * off any layout, hydrate client-side via `useAuth()` instead" posture
 * `app/layout.tsx` documents for itself, even though this particular
 * layout is never shared with the SSG/ISR page set (nothing under
 * `/account` is a candidate for static generation anyway) so a `cookies()`
 * read here specifically wouldn't cost anything elsewhere. Kept consistent
 * with the rest of the app regardless, since every other account-only
 * page/component (`<PriceGuaranteeClaimsList>`, `<OrderStatusView>`) already
 * established the client-side `useAuth()`-gate pattern — introducing a
 * second, server-side auth-check pattern just for this subtree would be a
 * new convention for no real benefit.
 */
export const metadata: Metadata = {
  title: "Your account | Tiro Mobile Tyres",
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountShell title="Your account" description="Manage your saved vehicles and addresses, and view your orders.">
      {children}
    </AccountShell>
  );
}
