"use client";

import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { TyreImage } from "@/components/catalog/tyre-image";
import { cx } from "@/components/ui/cx";
import { TruckIcon, TyreIcon, WrenchIcon } from "@/components/ui/icons";

/**
 * Extra gallery tiles shown after the model's own photos. These are IMAGE
 * SLOTS (see docs/prompts/IMAGE-MANIFEST.md): CSS placeholders until the
 * generated images are dropped into `public/images/pdp/`. Once a slot has a
 * `src`, it renders as a normal photo.
 */
const SLOTS: { key: string; label: string; src?: string; icon: typeof TyreIcon }[] = [
  { key: "tread", label: "Tread close-up", icon: TyreIcon },
  { key: "fitter", label: "Technician fitting your tyres", icon: WrenchIcon },
  { key: "van", label: "Our mobile fitting van", icon: TruckIcon },
];

/**
 * PDP gallery: a large main view and a thumbnail row. The first thumbnails are
 * the model's photos (placeholder SVG when there is none), followed by the
 * placeholder slots above. The main photo is the LCP image (eager, high
 * priority) with a reserved aspect ratio.
 */
export function PdpGallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const tiles = [
    ...images.map((src, i) => ({ key: `img-${i}`, src, label: `Photo ${i + 1}`, icon: TyreIcon, slot: false })),
    // Slots without a real photo are never shown (no icon-only thumbnails).
    ...SLOTS.filter((s) => s.src).map((s) => ({ key: s.key, src: s.src, label: s.label, icon: s.icon, slot: false })),
  ];
  const current = tiles[index] ?? tiles[0];

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence mode="wait" initial={false}>
      <m.div key={current.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
      {current.slot ? (
        <div
          role="img"
          aria-label={current.label}
          className="asphalt-texture flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-card text-white"
        >
          <current.icon className="h-14 w-14 text-gold" />
          <span className="px-6 text-center text-base font-bold">{current.label}</span>
        </div>
      ) : (
        <TyreImage
          src={current.src}
          alt={alt}
          priority
          sizes="(min-width: 1024px) 600px, 100vw"
          ratioClassName="aspect-square"
          className="rounded-card bg-gradient-to-b from-[#f4f4f4] to-[#e6e6e6]"
        />
      )}
      </m.div>
      </AnimatePresence>
      {tiles.length > 1 && (
      <ul className="grid grid-cols-5 gap-2" aria-label="Photos">
        {tiles.slice(0, 5).map((t, i) => (
          <li key={t.key}>
            <button
              type="button"
              aria-label={`Show ${t.slot || i >= images.length ? t.label.toLowerCase() : `photo ${i + 1} of ${images.length}`}`}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              className={cx(
                "flex aspect-square w-full items-center justify-center overflow-hidden rounded-control border-2 bg-chip",
                i === index ? "border-black" : "border-line hover:border-muted",
                t.slot && "asphalt-texture text-gold",
              )}
            >
              {t.slot ? (
                <t.icon className="h-6 w-6" />
              ) : (
                <TyreImage src={t.src} alt="" sizes="96px" className="h-full w-full" ratioClassName="h-full w-full" />
              )}
            </button>
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}
