import { ClockIcon, PhoneIcon, PinIcon, WhatsAppIcon } from "@/components/ui/icons";
import { areaPhrase, summariseCoverage } from "@/lib/locations/coverage";
import { loadLocationTree } from "@/lib/locations/helpers";
import { HOURS_LINE, PHONE_DISPLAY, PHONE_HREF, whatsappHref } from "@/lib/site/config";

/**
 * Dark strip above the header (mounted in the root layout). Left: where we serve (from the admin's served area, never a
 * literal place), opening hours and the phone number. Right: the green "Book via WhatsApp" button, the only use of the
 * `whatsapp` colour token (see the palette note in app/globals.css).
 *
 * 36px high at every width, so nothing around it shifts; the WhatsApp button is the full 36px, so the whole bar height is its hit area. Not sticky: it scrolls away and the main header stays pinned,
 * so permanent phone chrome is still the 56px header row. Below `lg` only the WhatsApp button shows (the header already
 * carries the phone), and with no WhatsApp number configured the whole strip is desktop-only. Server component; reads no
 * cookies or headers, so pages under the root layout stay static.
 */
export async function TopBar() {
  const area = areaPhrase(summariseCoverage(await loadLocationTree()));
  const whatsapp = whatsappHref();

  return (
    <div data-testid="top-bar" className={`bg-footer text-white ${whatsapp ? "" : "max-lg:hidden"}`}>
      <div className="container-page flex h-9 items-center justify-end gap-6 text-[13px] lg:justify-between">
        <div className="hidden min-w-0 items-center gap-6 lg:flex">
          {area && (
            <span className="flex min-w-0 items-center gap-1.5 text-footer-muted">
              <PinIcon className="h-4 w-4 shrink-0 text-accent-light" />
              <span className="truncate">Serving {area}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5 whitespace-nowrap text-footer-muted">
            <ClockIcon className="h-4 w-4 shrink-0 text-accent-light" />
            {HOURS_LINE}
          </span>
          <a href={PHONE_HREF} className="type-mono flex min-h-6 items-center gap-1.5 whitespace-nowrap py-1 font-bold text-white hover:underline">
            <PhoneIcon className="h-4 w-4 shrink-0 text-accent-light" />
            {PHONE_DISPLAY}
          </a>
        </div>

        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control bg-whatsapp px-3 font-bold text-white transition-colors duration-300 hover:bg-whatsapp-hover"
          >
            <WhatsAppIcon className="h-4 w-4 shrink-0" />
            Book via WhatsApp
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </div>
  );
}
