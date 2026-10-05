import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

/**
 * Home page section shell: 1140px container, 50px (phone) / 80px (desktop)
 * space above every section, bold H2, optional right-hand action.
 */
export function HomeSection({
  id,
  title,
  action,
  children,
  className,
}: {
  id: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className={cx("container-page pt-[50px] lg:pt-20", className)}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 lg:mb-8">
        <h2 id={`${id}-heading`} className="type-h2">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export const textLinkClassName =
  "inline-flex min-h-11 items-center gap-1 font-bold text-black underline decoration-gold decoration-[3px] underline-offset-4 hover:text-muted";
