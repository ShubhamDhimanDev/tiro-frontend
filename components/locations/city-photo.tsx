import { PinIcon } from "@/components/ui/icons";
import { cx } from "@/components/ui/cx";
import { locationImage } from "@/lib/site/images";

/**
 * City photo slot. Reads `lib/site/images.ts` (per-city, then the shared
 * location image). Until a photo exists it draws a token-based fallback: the
 * ink tread texture with the city name. Fixed aspect ratios (a 200px strip on
 * phones, a tall rounded panel from 1024px) so nothing shifts when the photo
 * arrives.
 */
export function CityPhoto({ citySlug, cityName, className }: { citySlug: string; cityName: string; className?: string }) {
  const image = locationImage(citySlug);
  return (
    <div
      data-testid="city-photo"
      className={cx(
        "asphalt-texture relative h-[200px] overflow-hidden rounded-card text-white sm:h-[240px] lg:h-full lg:min-h-[420px] lg:rounded-sheet",
        className,
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- static generated asset with known dimensions
        <img src={image.src} width={image.width} height={image.height} alt={image.alt} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 flex flex-col items-start justify-end gap-2 p-5 lg:p-8">
          <PinIcon className="h-8 w-8 text-gold lg:h-10 lg:w-10" />
          <p className="font-display max-w-full break-words text-4xl font-black uppercase leading-none tracking-tight lg:text-5xl">{cityName}</p>
        </div>
      )}
    </div>
  );
}
