"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Article/card image that never shows as a broken-image icon: if the CMS
 * `featured_image_path` 404s (or fails for any reason), it swaps to the
 * `fallback` (the hatched `ImageSlot` placeholder used for posts with no image).
 *
 * The server-rendered <img> can fail before React hydrates, in which case the
 * `error` event has already fired and `onError` never runs. The mount effect
 * covers that by checking the already-settled image state.
 */
export function ArticleImage({ src, className, fallback }: { src: string; className?: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- image host isn't known/configured yet, same posture as the PDP's own image
    <img ref={ref} src={src} alt="" className={className} onError={() => setFailed(true)} />
  );
}
