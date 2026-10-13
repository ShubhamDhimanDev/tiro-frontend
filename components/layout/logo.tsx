import Image from "next/image";
import { cx } from "@/components/ui/cx";

/**
 * TMT brand logo: the red-and-black mark on light surfaces (public/brand/tmt-logo.png), and the
 * red-and-white mark on dark surfaces (`tone="light"`, public/brand/tmt-logo-light.png). Both are
 * the client's supplied transparent PNGs (.design-reference/), so no white plate is needed behind
 * the lettering.
 */
export function Logo({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <span className={cx("inline-flex items-center leading-none", className)}>
      <Image
        src={tone === "light" ? "/brand/tmt-logo-light.png" : "/brand/tmt-logo.png"}
        alt="Tiro Mobile Tyres"
        width={634}
        height={492}
        priority
        // Rendered at 40-48px tall (about 52-62px wide). Without `sizes` next/image offers up to 1920px and phones fetch the full 634px file.
        sizes="(min-width: 768px) 62px, 52px"
        className="h-10 w-auto md:h-12"
      />
    </span>
  );
}
