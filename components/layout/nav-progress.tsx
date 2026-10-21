"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { m } from "framer-motion";

type Phase = "idle" | "loading" | "done";

/**
 * Thin yellow progress bar at the top of the viewport: starts when an
 * internal link is clicked, completes when the pathname changes. Decorative
 * (aria-hidden); route-level `loading.tsx` / `useLinkStatus` stay the primary
 * feedback. Gives up after 10s if the navigation never lands (same-path
 * click, failed fetch).
 */
export function NavProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [seenPath, setSeenPath] = useState(pathname);

  if (seenPath !== pathname) {
    setSeenPath(pathname);
    if (phase === "loading") setPhase("done");
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      setPhase("loading");
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (phase === "idle") return;
    const t = setTimeout(() => setPhase("idle"), phase === "done" ? 600 : 10_000);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "idle") return null;
  return (
    <m.div
      aria-hidden="true"
      data-testid="nav-progress"
      className="nav-progress"
      initial={{ scaleX: 0, opacity: 1 }}
      animate={
        phase === "loading"
          ? { scaleX: 0.85, opacity: 1, transition: { duration: 6, ease: [0.1, 0.8, 0.2, 1] } }
          : { scaleX: 1, opacity: 0, transition: { scaleX: { duration: 0.2 }, opacity: { duration: 0.3, delay: 0.2 } } }
      }
    />
  );
}
