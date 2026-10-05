"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "framer-motion";
import { CheckIcon } from "./icons";

type Toast = { id: number; message: string; actionHref?: string; actionLabel?: string };

type ToastApi = { show: (toast: Omit<Toast, "id">) => void };

const ToastContext = createContext<ToastApi | null>(null);

const NOOP: ToastApi = { show: () => {} };

/** Safe outside a provider (unit tests render components in isolation): becomes a no-op. */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP;
}

const DURATION_MS = 3500;

/**
 * One transient confirmation at a time, bottom-centre (above the phone PDP
 * sticky bar). `role="status"` so it is announced politely; auto-dismisses and
 * can be closed. A newer toast replaces the current one.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const nextId = useRef(0);
  const timer = useRef<number | null>(null);

  const dismiss = useCallback(() => setToast(null), []);

  const show = useCallback((t: Omit<Toast, "id">) => {
    nextId.current += 1;
    setToast({ ...t, id: nextId.current });
  }, []);

  useEffect(() => {
    if (!toast) return;
    timer.current = window.setTimeout(() => setToast(null), DURATION_MS);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [toast]);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[55] flex justify-center px-4 lg:bottom-6">
        <AnimatePresence>
          {toast && (
            <m.div
              key={toast.id}
              role="status"
              data-testid="toast"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
              className="pointer-events-auto flex max-w-md items-center gap-3 rounded-control bg-black py-2.5 pl-3 pr-2 text-sm font-semibold text-white shadow-overlay"
            >
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-black">
                <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <span className="min-w-0">{toast.message}</span>
              {toast.actionHref && (
                <Link href={toast.actionHref} onClick={dismiss} className="shrink-0 rounded-control px-2 py-1 font-bold text-gold underline underline-offset-2">
                  {toast.actionLabel ?? "View"}
                </Link>
              )}
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/15"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
