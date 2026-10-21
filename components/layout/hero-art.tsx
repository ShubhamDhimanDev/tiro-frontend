import Image from "next/image";
import { HERO_IMAGES } from "@/lib/site/images";

/** 1x1 transparent GIF. The desktop `<img>` below uses it as its own `src` so phones never download the real photo. */
const BLANK_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * Hero artwork. Shared by the home hero and `PageHero` as the fallback while a page has no image of its own.
 *
 * - Desktop (`lg`, 992px+): the wide van photo from `lib/site/images.ts`, or the chevron-and-van SVG while no photo exists.
 *   The photo is wide (2:1) but its slot is closer to square, so it is cropped to the middle of the frame; the crop is
 *   anchored 35% from the left so the van's nose stays in view instead of being clipped.
 * - Phones and small tablets: nothing by default, so the finder stays the first thing on screen. The home hero passes
 *   `mobile` to show the square van photo as a banner below the finder instead.
 *
 * The desktop photo sits in a `<picture>` whose only real source is gated by `min-width: 992px`; the `<img>` itself is a
 * blank pixel. A plain `<img src>` in a `hidden lg:block` wrapper is still fetched on phones, and because it is eager the
 * home page's prefetched data also made every other page preload it (191KB on /cart, /login, ...).
 */
export function HeroArt({ mobile = false }: { mobile?: boolean }) {
  const photo = HERO_IMAGES.desktop;
  const mobilePhoto = mobile ? HERO_IMAGES.mobile : null;
  if (photo) {
    return (
      <>
        {mobilePhoto && (
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-sheet md:aspect-[2/1] lg:hidden">
            <Image src={mobilePhoto.src} alt={mobilePhoto.alt} fill sizes="(min-width: 768px) 720px, 100vw" className="object-cover object-[50%_70%]" />
          </div>
        )}
        <div className="relative hidden h-full min-h-[420px] lg:block">
          <picture>
            <source media="(min-width: 992px)" srcSet={photo.src} width={photo.width} height={photo.height} />
            <img src={BLANK_PIXEL} width={photo.width} height={photo.height} alt={photo.alt} className="absolute inset-0 h-full w-full rounded-sheet object-cover object-[35%_50%]" />
          </picture>
        </div>
      </>
    );
  }
  return (
    <div aria-hidden="true" className="relative hidden h-full min-h-[420px] lg:block">
      <div className="absolute inset-y-0 -right-16 left-8 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="hero-bar-in absolute top-[-10%] h-[120%] -skew-x-[18deg] bg-gold"
            style={{ left: `${38 + i * 17}%`, width: `${14 - i * 3}%`, animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
      <svg viewBox="0 0 400 220" className="hero-van-in absolute bottom-6 right-0 w-[112%] max-w-none drop-shadow-xl">
        <ellipse cx="200" cy="205" rx="180" ry="9" fill="#000" opacity="0.15" />
        <path d="M30 150V70a12 12 0 0 1 12-12h190a10 10 0 0 1 10 10v82z" fill="#111" />
        <path d="M242 82h46c9 0 16 4 21 11l30 40c4 5 6 9 6 17v10H242z" fill="#222" />
        <path d="M254 92h32c5 0 8 2 11 6l20 28h-63z" fill="#8a8f96" opacity="0.8" />
        <rect x="30" y="112" width="212" height="12" fill="#ffce00" />
        <text x="136" y="104" textAnchor="middle" fontSize="30" fontWeight="800" fontStyle="italic" fill="#ffce00" fontFamily="Montserrat, sans-serif">
          TIRO
        </text>
        <rect x="30" y="150" width="293" height="16" rx="3" fill="#111" />
        {[96, 268].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="166" r="27" fill="#0a0a0a" />
            <circle cx={cx} cy="166" r="15" fill="#d9d9d9" />
            <circle cx={cx} cy="166" r="5" fill="#555" />
          </g>
        ))}
      </svg>
    </div>
  );
}
