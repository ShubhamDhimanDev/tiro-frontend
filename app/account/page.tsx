import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { ArrowRightIcon, CalendarIcon, PinIcon, TagIcon, TyreIcon } from "@/components/ui/icons";

/**
 * `/account` landing: one card per account section, including the price-match
 * claims page, then two quick actions. No data fetching here; each section's
 * list component does its own `useAuth()`-gated fetch.
 */
const SECTIONS = [
  { href: "/account/orders", title: "Order history", text: "View your past orders and bookings.", Icon: CalendarIcon },
  { href: "/account/vehicles", title: "Saved vehicles", text: "Manage the vehicles and tyre sizes you have saved.", Icon: TyreIcon },
  { href: "/account/addresses", title: "Saved addresses", text: "Manage the fitting addresses you have saved.", Icon: PinIcon },
  { href: "/price-guarantee-claims", title: "Price-match claims", text: "Track the status of your price-match claims.", Icon: TagIcon },
] as const;

export default function AccountPage() {
  return (
    <div className="flex flex-col gap-8">
      <ul className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map(({ href, title, text, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full items-start gap-4 rounded-card border border-line bg-surface p-5 shadow-rest transition-shadow hover:shadow-raised"
            >
              <span aria-hidden="true" className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-gold text-black">
                <Icon className="h-6 w-6" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-bold text-ink group-hover:underline">{title}</span>
                <span className="text-[15px] text-muted">{text}</span>
              </span>
              <ArrowRightIcon aria-hidden="true" className="ml-auto mt-1 h-5 w-5 shrink-0 text-black" />
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="quick-heading" className="flex flex-col gap-4 rounded-card bg-ink p-6 text-white md:p-8">
        <h2 id="quick-heading" className="type-h2 !text-[28px]">
          Need new tyres?
        </h2>
        <p className="max-w-xl text-white/80">Your saved vehicle and address are ready to use at checkout.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/tyres" className={buttonClassName({ variant: "green" })}>
            Search tyres
          </Link>
          <Link href="/booking" className={buttonClassName({ variant: "yellow" })}>
            Book a fitting
          </Link>
        </div>
      </section>
    </div>
  );
}
