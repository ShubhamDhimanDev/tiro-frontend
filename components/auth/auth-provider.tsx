"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicCustomer } from "@/lib/auth/types";
import { authApi } from "@/lib/auth/client-api";

interface AuthContextValue {
  customer: PublicCustomer | null;
  /** True until the initial client-side session check (or an explicit `initialCustomer`) has resolved. */
  loading: boolean;
  /** Called by every auth form on a successful token-issuing response. */
  setCustomer: (customer: PublicCustomer) => void;
  /** Logs out this device only. Clears context state and the session cookies. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Root-level auth context.
 *
 * `initialCustomer`, if passed, skips the client-side check below — useful
 * for a future already-dynamic page (e.g. an `/account` page that's SSR
 * anyway) that can read `getSessionCustomer()` server-side cheaply. Left
 * `undefined` here at the root layout on purpose: this app's
 * `cacheComponents` flag is off, so a `cookies()` read at the root would
 * force every page sharing this layout into dynamic SSR, defeating the
 * SSG/ISR strategy for location/brand/blog pages. Instead, on mount, this
 * provider does one `GET /api/auth/session` — a Route Handler that reads
 * the httpOnly cookie server-side and returns the customer snapshot (or
 * `null`) — to hydrate real session state without that cost.
 *
 * The "no second round trip" requirement from the task brief is satisfied
 * at the moment that matters: every token-issuing Route Handler
 * (register/verify, login, otp/verify, password/reset/verify) already
 * returns `{ customer }` in the same response that sets the cookie — see
 * `lib/auth/route-helpers.ts` — so `setCustomer()` below is called directly
 * from that response, with no extra fetch. This mount-time check only
 * covers the separate case of a *returning* visitor loading a fresh page.
 */
export function AuthProvider({
  initialCustomer,
  children,
}: {
  initialCustomer?: PublicCustomer | null;
  children: React.ReactNode;
}) {
  const [customer, setCustomerState] = useState<PublicCustomer | null>(initialCustomer ?? null);
  const [loading, setLoading] = useState(initialCustomer === undefined);
  const router = useRouter();

  useEffect(() => {
    if (initialCustomer !== undefined) return;
    let cancelled = false;

    fetch("/api/auth/session", { method: "GET" })
      .then((res) => (res.ok ? res.json() : { customer: null }))
      .then((body: { customer: PublicCustomer | null }) => {
        if (!cancelled) setCustomerState(body.customer ?? null);
      })
      .catch(() => {
        // Network error checking session state — treat as signed out
        // rather than leaving the header stuck in a loading state.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Intentionally runs once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCustomer = useCallback((next: PublicCustomer) => {
    setCustomerState(next);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setCustomerState(null);
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ customer, loading, setCustomer, logout }),
    [customer, loading, setCustomer, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
