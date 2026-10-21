import Link from "next/link";
import { cx } from "@/components/ui/cx";

const ITEMS = [
  { key: "size", href: "/tyres", label: "By size" },
  { key: "vehicle", href: "/tyres/by-vehicle", label: "By vehicle" },
  { key: "rego", href: "/tyres/by-rego", label: "By number plate" },
  { key: "type", href: "/tyres/type", label: "By type" },
  { key: "brand", href: "/brands", label: "By brand" },
] as const;

export type FinderKey = (typeof ITEMS)[number]["key"];

/**
 * Link tabs shared by the "find tyres" pages (size, vehicle, number plate,
 * type, brand). Plain links, so each way in stays a crawlable page. The rego
 * link only shows when the feature flag is on.
 */
export function FinderNav({ active, rego = false }: { active: FinderKey; rego?: boolean }) {
  return (
    <nav aria-label="Find tyres by" className="-mx-5 overflow-x-auto px-5 [mask-image:linear-gradient(to_right,#000_88%,transparent)] [scrollbar-width:none] md:mx-0 md:px-0 md:[mask-image:none]">
      <ul className="flex w-max gap-4 border-b border-line pr-6 md:gap-6 md:pr-0">
        {ITEMS.filter((i) => rego || i.key !== "rego").map((i) => (
          <li key={i.key}>
            <Link
              href={i.href}
              aria-current={i.key === active ? "page" : undefined}
              className={cx(
                "inline-flex min-h-12 items-center border-b-[3px] text-sm font-bold md:text-[15px]",
                i.key === active ? "border-gold text-black" : "border-transparent text-muted hover:text-black",
              )}
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
