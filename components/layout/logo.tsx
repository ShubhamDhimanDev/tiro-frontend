import Image from "next/image";
import { cx } from "@/components/ui/cx";

/**
 * TMT brand logo (public/brand/tmt-logo.png, transparent PNG with black
 * lettering). On dark surfaces (`tone="light"`) the black "TMT" would vanish,
 * so the mark sits on a white rounded plate.
 */
export function Logo({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center leading-none",
        tone === "light" && "rounded-control bg-white px-2 py-1",
        className,
      )}
    >
      <Image
        src="/brand/tmt-logo.png"
        alt="Tiro Mobile Tyres"
        width={640}
        height={500}
        priority
        // Rendered at 40-48px tall (about 52-62px wide). Without `sizes` next/image offers up to 1920px and phones fetch the full 640px file.
        sizes="(min-width: 768px) 62px, 52px"
        className="h-10 w-auto md:h-12"
      />
    </span>
  );
}
