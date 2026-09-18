"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ServiceZoneSnapshot } from "@/lib/location/types";
import { locationApi } from "@/lib/location/client-api";

interface LocationContextValue {
  zone: ServiceZoneSnapshot | null;
  /** True until the initial client-side zone check has resolved. */
  loading: boolean;
  /** Called by the capture form on a `serviceable: true` response — the cookie is already set server-side by that point, this just updates UI state. */
  setZone: (zone: ServiceZoneSnapshot) => void;
  /** Clears zone state + cookie — explicit "change location", or a downstream stale/invalid-zone signal. */
  clearZone: () => Promise<void>;
}

const LocationContext = createContext<LocationContextValue | null>(null);

/**
 * Root-level service-zone context — same shape and rationale as
 * `<AuthProvider>` (components/auth/auth-provider.tsx). This project's
 * `cacheComponents` flag is off, so a `cookies()` read at the root layout
 * would force every page sharing it into dynamic SSR, defeating the
 * SSG/ISR strategy for brand/browse pages. Instead this hydrates client-side
 * on mount via `GET /api/location/session`, which reads the httpOnly zone
 * cookie server-side.
 *
 * Individual SSR pages that need the zone for first-paint data (the `/tyres`
 * search page) read `getServiceZone()` directly server-side instead of
 * going through this context — they're already dynamic (they read
 * `searchParams`), so there's no SSG cost to a `cookies()` read there.
 */
export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [zone, setZoneState] = useState<ServiceZoneSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    locationApi
      .session()
      .then((result) => {
        if (cancelled) return;
        setZoneState(result.kind === "success" ? result.data.zone : null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setZone = useCallback((next: ServiceZoneSnapshot) => {
    setZoneState(next);
    setLoading(false);
  }, []);

  const clearZone = useCallback(async () => {
    await locationApi.clear();
    setZoneState(null);
  }, []);

  const value = useMemo(() => ({ zone, loading, setZone, clearZone }), [zone, loading, setZone, clearZone]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error("useLocation must be used within <LocationProvider>");
  }
  return ctx;
}
