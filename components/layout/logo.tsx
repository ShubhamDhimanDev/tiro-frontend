import Image from "next/image";
import { cx } from "@/components/ui/cx";

/**
 * TMT brand logo, supplied by the client as transparent PNGs (.design-reference/), so no white plate is needed behind
 * the lettering. Two artworks, each in two tones:
 *
 * - the round mark alone (`tmt-logo*.png`), the default, and
 * - the wide lockup, mark plus "TIRO MOBILE TYRES" (`wide`, `tmt-logo-wide*.png`), used in the header.
 *
 * `tone="dark"` is the red-and-black artwork for light surfaces. `tone="light"` is the red-and-white artwork for dark
 * surfaces: its lettering is white, so it is invisible on a white background and must only sit on black or dark grey.
 */
const ART = {
  mark: { dark: "/brand/tmt-logo.png", light: "/brand/tmt-logo-light.png", width: 634, height: 492 },
  wide: { dark: "/brand/tmt-logo-wide.png", light: "/brand/tmt-logo-wide-light.png", width: 856, height: 248 },
};

export function Logo({ tone = "dark", wide = false, className }: { tone?: "dark" | "light"; wide?: boolean; className?: string }) {
  const art = wide ? ART.wide : ART.mark;
  return (
    <span className={cx("inline-flex items-center leading-none", className)}>
      <Image
        src={art[tone]}
        alt="Tiro Mobile Tyres"
        width={art.width}
        height={art.height}
        priority
        // Without `sizes` next/image offers up to 1920px and phones fetch the full-size file. Mark: 40-48px tall (about
        // 52-62px wide). Wide lockup: 32px tall on phones (about 110px wide), 48px from md, 56px from lg (about 193px
        // wide, inside the 72px header row).
        sizes={wide ? "(min-width: 1024px) 193px, (min-width: 768px) 166px, 110px" : "(min-width: 768px) 62px, 52px"}
        className={wide ? "h-8 w-auto md:h-12 lg:h-14" : "h-10 w-auto md:h-12"}
      />
    </span>
  );
}
