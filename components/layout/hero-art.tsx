import { HERO_IMAGES } from "@/lib/site/images";

/**
 * Placeholder hero artwork: yellow chevron bars with a stylised van. Shared by
 * the home hero and `PageHero` as the graceful fallback while no photograph
 * exists. Replace with the generated image (docs/prompts/) via `lib/site/images.ts`.
 * Decorative and desktop-only (`lg`).
 */
export function HeroArt() {
  const photo = HERO_IMAGES.desktop;
  if (photo) {
    return (
      <div className="relative hidden h-full min-h-[420px] lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element -- static generated asset with known dimensions */}
        <img src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} className="absolute inset-0 h-full w-full rounded-sheet object-cover" />
      </div>
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
