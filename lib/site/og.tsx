import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site/config";

export const OG_SIZE = { width: 1200, height: 630 } as const;

/**
 * Brand OG card (yellow on black). Uses the default sans so it needs no font
 * fetch at build time. Text only: no photography, no third-party artwork.
 */
export function ogCard({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#000", color: "#fff", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 800, color: "#FFCE00" }}>
          <div style={{ width: 20, height: 56, background: "#FFCE00", transform: "skewX(-18deg)" }} />
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {eyebrow && <div style={{ fontSize: 30, fontWeight: 700, color: "#FFCE00", textTransform: "uppercase" }}>{eyebrow}</div>}
          <div style={{ fontSize: title.length > 40 ? 64 : 80, fontWeight: 800, lineHeight: 1.05 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 34, color: "#d6d6d6" }}>{subtitle}</div>}
        </div>
        <div style={{ display: "flex", height: 12, background: "#FFCE00", width: 220 }} />
      </div>
    ),
    OG_SIZE,
  );
}
