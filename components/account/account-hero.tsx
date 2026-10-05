"use client";

import { usePathname } from "next/navigation";
import { PageHero } from "@/components/page/page-hero";
import { accountSectionTitle } from "@/lib/account/sections";

/**
 * Hero band for the account area. On a section page (`/account/orders`, ...)
 * the H1 is that section's name with "Your account" as the eyebrow, so every
 * page has its own heading; on the overview it is "Your account" itself.
 */
export function AccountHero({
  title,
  description,
  crumbs,
}: {
  title: string;
  description: string;
  crumbs: { name: string; url: string }[];
}) {
  const pathname = usePathname() ?? "";
  const section = accountSectionTitle(pathname);
  return (
    <PageHero
      crumbs={section ? [...crumbs, { name: section, url: pathname }] : crumbs}
      eyebrow={section ? title : undefined}
      title={section ?? title}
      lead={description}
      className="[&>div]:md:py-10"
    />
  );
}
