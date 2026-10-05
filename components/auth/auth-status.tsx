"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { buttonClassName } from "@/components/ui/button";
import { LogOutIcon, UserIcon } from "@/components/ui/icons";

const headerLink =
  "tap-target inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-2.5 text-sm font-semibold whitespace-nowrap text-ink transition-colors hover:bg-chip";

/**
 * Session status. `variant="header"` is the compact desktop/tablet header
 * cluster; `variant="menu"` is the stacked block inside the phone menu.
 *
 * Reads the client-hydrated `AuthProvider` snapshot (no `cookies()` in the
 * root layout). While the mount-time session check is in flight it renders a
 * fixed-size placeholder so signed-out visitors never see a "Log in" flash
 * and the header does not shift.
 */
export function AuthStatus({ variant = "header", onNavigate }: { variant?: "header" | "menu"; onNavigate?: () => void }) {
  const { customer, loading, logout } = useAuth();

  if (variant === "menu") {
    if (loading) return <div className="h-24" aria-hidden="true" />;
    if (!customer) {
      return (
        <div className="grid grid-cols-2 gap-3">
          <Link href="/login" onClick={onNavigate} className={buttonClassName({ variant: "secondary", fullWidth: true })}>
            Log in
          </Link>
          <Link href="/register" onClick={onNavigate} className={buttonClassName({ variant: "secondary", fullWidth: true })}>
            Create account
          </Link>
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        <p className="px-1 pb-2 text-sm text-muted">Hi, {customer.name}</p>
        {[
          { href: "/account", label: "My account" },
          { href: "/account/orders", label: "Orders" },
          { href: "/price-guarantee-claims", label: "Price-match claims" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className="flex min-h-12 items-center rounded-control px-1 text-base font-medium text-ink hover:bg-chip"
          >
            {l.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            void logout();
          }}
          className="flex min-h-12 items-center rounded-control px-1 text-left text-base font-medium text-ink underline underline-offset-2 hover:bg-chip"
        >
          Log out
        </button>
      </div>
    );
  }

  if (loading) return <div className="h-11 w-11 xl:w-24" aria-hidden="true" />;

  if (!customer) {
    return (
      <Link href="/login" className={headerLink}>
        <UserIcon className="h-5 w-5" />
        <span className="hidden xl:inline">Log in</span>
        <span className="sr-only xl:hidden">Log in</span>
      </Link>
    );
  }

  return (
    <div data-auth="in" className="flex items-center gap-0.5">
      <Link href="/account" className={headerLink}>
        <UserIcon className="h-5 w-5" />
        <span className="sr-only">My account</span>
        <span className="hidden max-w-[4.5rem] truncate xl:inline min-[1360px]:max-w-[7rem]">Hi, {customer.name}</span>
      </Link>
      <button type="button" aria-label="Log out" onClick={() => void logout()} className={`${headerLink} font-medium`}>
        <LogOutIcon className="h-5 w-5" />
        <span className="hidden min-[1536px]:inline">Log out</span>
      </button>
    </div>
  );
}
