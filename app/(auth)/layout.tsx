import { ImageSlot } from "@/components/page/image-slot";
import { CheckIcon } from "@/components/ui/icons";
import { Logo } from "@/components/layout/logo";

const PERKS = ["See every order and booking in one place", "Save your vehicles and addresses", "Check out faster next time"];

/**
 * Login, register and password reset share one frame: a black brand panel on
 * the left (desktop only, with a placeholder image slot) and the form card on
 * the right. On phones only the form card shows. Top-aligned (not vertically
 * centred) so the card does not jump when an error or the next step changes
 * its height.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-start justify-center bg-band px-[var(--gutter)] py-8 sm:py-12 lg:py-16">
      <div className="grid w-full max-w-[1000px] overflow-hidden rounded-card bg-surface shadow-overlay lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <aside aria-hidden="true" className="relative hidden flex-col justify-between gap-8 overflow-hidden bg-ink p-8 text-white lg:flex">
          {[0, 1].map((i) => (
            <span
              key={i}
              className="absolute -right-6 top-[-10%] h-[120%] -skew-x-[18deg] bg-gold"
              style={{ width: `${5 - i * 2}%`, right: `${i * 6}%` }}
            />
          ))}
          <Logo tone="light" />
          <div className="relative flex flex-col gap-4">
            <p className="text-3xl font-extrabold leading-tight tracking-[-1px]">Your tyre shop on wheels</p>
            <ul className="flex flex-col gap-2 text-[15px] text-white/85">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-black">
                    <CheckIcon className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <ImageSlot slot="auth-side" className="relative max-h-[220px] !w-full" />
        </aside>
        <div className="flex flex-col p-5 sm:p-8 lg:p-10">{children}</div>
      </div>
    </div>
  );
}
