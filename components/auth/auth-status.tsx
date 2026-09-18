"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";

/**
 * Minimal proof-of-wiring for the session-hydration boundary this task is
 * about — not a full account/header build-out (out of scope here). Shows
 * that `customer` is available on first paint from the server-set snapshot
 * cookie (docs/architecture/08-customer-auth-otp.md §9's "stay signed in is
 * the default" applied across page loads), and that logging out clears it
 * immediately via the same context.
 */
export function AuthStatus() {
  const { customer, loading, logout } = useAuth();

  // Avoid flashing "Log in" before the mount-time session check
  // (GET /api/auth/session) resolves — see auth-provider.tsx.
  if (loading) {
    return <div className="h-8 w-24" aria-hidden />;
  }

  if (!customer) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <Link href="/login" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          Log in
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Create account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">Hi, {customer.name}</span>
      <button
        type="button"
        onClick={() => logout()}
        className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        Log out
      </button>
    </div>
  );
}
