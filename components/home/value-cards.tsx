import Link from "next/link";
import { ArrowRightIcon, ShieldIcon, TagIcon } from "@/components/ui/icons";
import { BuildingIcon, CardIcon } from "@/components/ui/icons-extra";
import { HOME_VALUE_CARDS } from "@/lib/home/content";

const ICONS = { "price-match": TagIcon, payments: CardIcon, warranties: ShieldIcon, fleet: BuildingIcon };

/**
 * Four linked cards under the trust strip: price match, payment options, warranties and returns, fleet. Each links to
 * its info page and says only what that page backs up (copy lives in `lib/home/content.ts`). Static; no data fetching.
 */
export function ValueCards() {
  return (
    <section aria-labelledby="value-heading" className="container-page pt-[50px] lg:pt-20">
      <h2 id="value-heading" className="sr-only">
        More ways we make it easy
      </h2>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:gap-5">
        {HOME_VALUE_CARDS.map(({ id, title, body, href }) => {
          const Icon = ICONS[id];
          return (
            <li key={id} className="flex">
              <Link
                href={href}
                className="group flex w-full items-center gap-4 rounded-card border border-line bg-surface p-5 transition-[border-color,box-shadow] duration-300 hover:border-black hover:shadow-raised lg:gap-5 lg:p-6"
              >
                <Icon className="h-10 w-10 shrink-0 text-black" />
                <span className="flex flex-1 flex-col gap-1">
                  <span className="type-h3">{title}</span>
                  <span className="text-[15px] leading-snug text-muted">{body}</span>
                </span>
                <ArrowRightIcon className="h-5 w-5 shrink-0 text-black transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
