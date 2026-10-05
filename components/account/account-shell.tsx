import { AccountNav } from "@/components/account/account-nav";
import { AccountHero } from "@/components/account/account-hero";

/**
 * Frame for every account page: the standard black hero band (breadcrumb, H1
 * naming the section, one line of context), then a sub-nav card and the content. One column on
 * phones (the nav is a scrollable row above the content), left nav + content
 * from 1024px. Shared by `app/account/layout.tsx` and the price-match claims
 * page, which lives outside `/account` but belongs in the same nav.
 */
export function AccountShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Account", url: "/account" },
  ];
  return (
    <>
      <AccountHero crumbs={crumbs} title={title} description={description} />
      <div className="container-page py-8 md:py-12">
        <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
          <AccountNav />
          <div className="min-w-0 max-w-3xl">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
