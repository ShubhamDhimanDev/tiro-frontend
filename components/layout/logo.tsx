import Image from "next/image";
import { cx } from "@/components/ui/cx";

/**
 * TMT brand logo. Two artworks:
 *
 * - the round mark alone (`tmt-logo.png`, transparent PNG with black lettering), the default. On dark surfaces
 *   (`tone="light"`) the black "TMT" would vanish, so the mark sits on a white rounded plate.
 * - the wide lockup, mark plus "TIRO MOBILE TYRES" (`wide`, used in the header). `tone="dark"` is the black-and-yellow
 *   artwork for light surfaces; `tone="light"` is the white-and-yellow artwork for dark surfaces and needs no plate.
 *   Both wide files are derived from the client's red-and-black / red-and-white artwork (the red recoloured to the
 *   brand yellow with Pillow, "MOBILE TYRES" set neutral to match the mockup) until the client supplies official
 *   yellow artwork; replace the two PNGs in public/brand/ when they do.
 */
const ART = {
  mark: { dark: "/brand/tmt-logo.png", light: "/brand/tmt-logo.png", width: 640, height: 500 },
  wide: { dark: "/brand/tmt-logo-wide.png", light: "/brand/tmt-logo-wide-light.png", width: 856, height: 248 },
};

export function Logo({ tone = "dark", wide = false, className }: { tone?: "dark" | "light"; wide?: boolean; className?: string }) {
  const art = wide ? ART.wide : ART.mark;
  return (
    <span
      className={cx(
        "inline-flex items-center leading-none",
        tone === "light" && !wide && "rounded-control bg-white px-2 py-1",
        className,
      )}
    >
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
