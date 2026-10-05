import Link from "next/link";

/**
 * Visible breadcrumb trail. Pass the same items as `BreadcrumbJsonLd` so the
 * markup and the structured data always agree. The last item is the current
 * page and is not a link.
 */
export function Breadcrumbs({ items, tone = "light" }: { items: { name: string; url: string }[]; tone?: "light" | "dark" | "gold" }) {
  const dark = tone === "dark";
  const gold = tone === "gold";
  return (
    <nav aria-label="Breadcrumb" className={`text-sm ${dark ? "text-footer-muted" : gold ? "text-black/80" : "text-muted"}`}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.url} className="flex min-w-0 items-center gap-2">
              {last ? (
                <span aria-current="page" className={`truncate ${dark ? "text-white" : gold ? "font-bold text-black" : "text-ink"}`}>
                  {item.name}
                </span>
              ) : (
                <Link href={item.url} className={`-my-1.5 inline-flex min-h-11 items-center underline-offset-2 hover:underline ${dark ? "hover:text-white" : "hover:text-ink"}`}>
                  {item.name}
                </Link>
              )}
              {!last && (
                <span aria-hidden="true" className={dark ? "text-footer-muted/60" : gold ? "text-black/40" : "text-line"}>
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
