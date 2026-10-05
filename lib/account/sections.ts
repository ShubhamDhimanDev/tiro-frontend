/**
 * Title for the account section a URL belongs to, most specific prefix first.
 * `/account` itself has none (its hero is "Your account"). Used by the hero H1
 * so every account page has its own heading; document titles are set per page
 * with `metadata` using the same wording.
 */
const TITLES: [prefix: string, title: string][] = [
  ["/account/vehicles/new", "Add a vehicle"],
  ["/account/vehicles", "Saved vehicles"],
  ["/account/addresses/new", "Add an address"],
  ["/account/addresses", "Saved addresses"],
  ["/account/orders", "Order history"],
];

export function accountSectionTitle(pathname: string): string | null {
  if (pathname.includes("/edit")) return pathname.includes("/vehicles/") ? "Edit vehicle" : "Edit address";
  const hit = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return hit?.[1] ?? null;
}
