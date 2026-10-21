import { ClockIcon, PinIcon, WhatsAppIcon } from "@/components/ui/icons";
import { areaPhrase, summariseCoverage } from "@/lib/locations/coverage";
import { loadLocationTree } from "@/lib/locations/helpers";
import { HOURS_LINE, whatsappHref } from "@/lib/site/config";

/**
 * Dark contact strip above the header (mounted in the root layout). Left: where we serve (from the admin's served area,
 * never a literal place) and the opening hours. Right: the green "Book via WhatsApp" button. There is no phone number
 * here: the header already carries the call button.
 *
 * 36px high at every width, so nothing around it shifts; the button is the full 36px, so the whole bar height is its hit
 * area. Not sticky: it scrolls away and the main header stays pinned, so permanent phone chrome is still the 56px header
 * row. Below `lg` only the WhatsApp button shows. The WhatsApp number is the call number (`whatsappHref()` in
 * `lib/site/config.ts`). Server component; reads no cookies or headers, so pages under the root layout stay static.
 */
export async function TopBar() {
  const area = areaPhrase(summariseCoverage(await loadLocationTree()));

  return (
    <div data-testid="top-bar" className="bg-footer text-white">
      <div className="container-page flex h-9 items-center justify-end gap-6 text-[13px] lg:justify-between">
        <div className="hidden min-w-0 items-center gap-6 lg:flex">
          {area && (
            <span className="flex min-w-0 items-center gap-1.5 text-footer-muted">
              <PinIcon className="h-4 w-4 shrink-0 text-gold" />
              <span className="truncate">Serving {area}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5 whitespace-nowrap text-footer-muted">
            <ClockIcon className="h-4 w-4 shrink-0 text-gold" />
            {HOURS_LINE}
          </span>
        </div>

        <a
          href={whatsappHref()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control bg-green px-3 font-bold text-white transition-colors duration-300 hover:bg-green-hover"
        >
          <WhatsAppIcon className="h-4 w-4 shrink-0" />
          Book via WhatsApp
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </div>
  );
}
