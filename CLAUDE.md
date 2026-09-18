@AGENTS.md

## Customer auth (registration/login/OTP/password-reset)

Implementation follows `docs/architecture/08-customer-auth-otp.md` (§12 is the
load-bearing contract for response shapes/status codes). Summary of what
lives where — see that doc and this file's git history for the full
reasoning, not repeated here:

- `lib/auth/` — the backend-agnostic client layer. `backend.ts` is the single
  switch point between `backend-client.ts` (live `fetch` calls to Laravel's
  `/api/v1/auth/*`) and `backend-stub.ts` (in-memory dev/test stub). As of
  2026-09-10 backend-agent's endpoints are live and **live is the default** —
  set `AUTH_BACKEND=stub` only to opt back into the in-memory stub (e.g.
  isolated component tests without Laravel running). `LARAVEL_API_URL`
  defaults to `http://localhost:8000`, matching `backend/.env`'s `APP_URL`.
- `app/api/auth/**` — this app's own Route Handlers that the browser actually
  calls. They proxy to `lib/auth/backend.ts` and, on a token-issuing success,
  set the httpOnly session cookie via `lib/auth/cookies.ts` — the token is
  never sent to client JS.
- `components/auth/` — the registration/login/password-reset forms and the
  `<AuthProvider>` context (`app/layout.tsx` wraps the whole site in it).

**Rendering-strategy constraint that shaped this:** `cacheComponents` is not
enabled in `next.config.ts` (classic rendering model), so `cookies()` /
`headers()` / `searchParams` must never be read from the root layout or any
other layout shared with the SSG/ISR page set — doing so forces every page
under it into per-request dynamic SSR. `<AuthProvider>` therefore hydrates
session state client-side (one `GET /api/auth/session` on mount) rather than
via a server-rendered cookie read in `app/layout.tsx`. If Cache Components
gets enabled later, that mount-time fetch could be replaced by a
`<Suspense>`-wrapped server read for a flash-free header — not done now
since the flag is off.

## Location/serviceability + catalogue/search/browse/PDP (Phase 1)

Implementation follows `docs/architecture/02-api-contract.md`'s "Location/
serviceability state flow" and "Catalogue & location endpoints" sections.
Same domain-folder pattern as auth above:

- **Both `lib/location/backend.ts` and `lib/catalog/backend.ts` default to
  live**, same as `lib/auth/backend.ts` — backend-agent's
  `/api/v1/serviceability`, `/api/v1/tyres*`, and `/api/v1/brands`
  endpoints have been confirmed up for a while now, so as of 2026-09-11
  these two switches flipped to "live is the default" the same way
  `AUTH_BACKEND`'s did once its endpoints landed. Set
  `LOCATION_BACKEND=stub` and `CATALOG_BACKEND=stub` to opt back into the
  in-memory stub — e.g. for isolated component tests that shouldn't
  depend on a running Laravel process. The stub's fixture data lives in
  `lib/catalog/fixtures.ts` (5 models across 3 brands, 8 variants, 1 zone)
  and `lib/location/backend-stub.ts` (Melbourne Metro, VIC postcodes
  3000–3207 + a short suburb list).
- `lib/location/` — serviceability check + the resolved-zone cookie
  (`mts_service_zone`, httpOnly, 30-day). `app/api/location/{check,session,clear}/route.ts`
  are the Route Handlers the browser actually calls (mirrors
  `app/api/auth/**`); `<LocationProvider>` (`components/location/`) hydrates
  client-side the same way `<AuthProvider>` does, for the same cache-
  components-off reason. SSR pages that need the zone for first-paint data
  (the `/tyres` search page) read `getServiceZone()` directly server-side
  instead of going through the provider.
- `lib/catalog/` — tyres/brands client layer, money/grouping/search-param
  helpers. Only one endpoint is proxied through this app's own Route
  Handler (`app/api/catalog/tyres/[slug]/availability/route.ts`) — the PDP
  availability fetch, which must be client-side and never cached. Every
  other catalog read (search first paint, brand/type/latest-release browse
  pages, PDP static content) is a direct server-side `fetch` from a Server
  Component straight to `catalogBackend`, no proxy layer needed since it
  never touches the browser.
- `app/tyres/page.tsx` — the tyre-size search UI *and* the browse hub
  (popular sizes, browse-by-type, links to brands/latest-releases) in one
  route: it's a hub when no filter params are present, SSR search results
  otherwise. Not spelled out as a single route in the contract — a routing
  judgment call, see the page's own doc comment.
- **Staggered search pagination (reconciled 2026-09-11):** front and rear
  results paginate independently via two distinct query params,
  `front_page`/`rear_page`, matching `TyreController::index()`'s real
  implementation — not the single shared `page` this round originally
  shipped with under the (incorrect) assumption that the contract had no
  separate front/rear page params. `lib/catalog/search-params.ts`'s
  `buildTyreSearchQuery`/`buildTyresStaggeredPageHref` and
  `<TyreSearchResultsStaggered>`'s two independent
  `<PaginationControls>` implement this; the stub
  (`lib/catalog/backend-stub.ts`) mirrors the same param names so dev/test
  against the stub exercises the real shape.
- `app/tyres/[slug]/page.tsx` (PDP) fetches only the static-content
  endpoint and is SSG/ISR; `<PdpAvailability>` is a separate, always-live
  client fetch — the two are deliberately never merged into one call.
- `app/brands/`, `app/tyres/type/[type]/`, `app/tyres/latest-releases/` —
  SSG/ISR browse pages, 1-hour `revalidate` (a judgment call, not specified
  by the contract; superseded once the admin-panel on-demand revalidation
  webhook from `02-api-contract.md` is wired).
- Known gaps, not silently dropped: no `LocalBusiness`/`Service` structured
  data yet (that's for location content pages — state/city/suburb — which
  weren't in this round's scope, only the serviceability *capture* flow
  was); PDP `Product` JSON-LD ships without an `offers` block since price is
  zone/time-scoped and never available at SSG/ISR time.

## Vehicle identification & fitment picker (Phase 2)

Implementation follows `docs/architecture/02-api-contract.md`'s "Vehicle
identification & fitment endpoints" section (added 2026-09-14). Same
domain-folder pattern as auth/location/catalog above, with one difference:
**`lib/vehicles/backend.ts` defaults to live from the start** —
backend-agent's four `/api/v1/vehicles/*` endpoints were independently
confirmed live (the real controller was read, not just a status report)
before this round was dispatched, so there was no stub-then-reconcile step
the way catalog/location had. Set `VEHICLES_BACKEND=stub` to opt back into
the in-memory stub (fixture data in `lib/vehicles/fixtures.ts`: a Toyota
Corolla family reproducing the contract's own disambiguation example —
ids 41/42 share a 2019–2023 year range, 42 repurposed as the staggered
case, id 38 is the zero-fitment case — plus one unambiguous Mazda 3 and one
Holden Commodore).

- `lib/vehicles/` — makes/models/years/fitment client layer + pure
  `year-groups.ts` grouping/label helpers (kept out of the component per
  this codebase's pure-logic-separate-from-React convention, same as
  `lib/catalog/group-by-model.ts`).
- **Every `/api/vehicles/*` call is proxied through this app's own Route
  Handlers** (`app/api/vehicles/{makes,models,years}/route.ts`,
  `app/api/vehicles/[vehicle]/fitment/route.ts`), unlike most of the
  catalog domain — because, unlike catalog's SSR/SSG first paints, every
  step of the make → model → year → fitment cascade is inherently a live
  client fetch driven by the user's previous pick (there's no
  server-rendered state to hydrate into). This mirrors the one catalog
  endpoint that's proxied for the same reason, PDP availability
  (`app/api/catalog/tyres/[slug]/availability/route.ts`) — browser never
  calls Laravel directly, keeping `LARAVEL_API_URL` server-only.
- `components/vehicles/vehicle-picker.tsx` — the 4-step cascade UI (make →
  model → year/generation → series/body_type disambiguation only when a
  year range has more than one candidate `Vehicle` row → fitment fetch).
  No separate "confirm vehicle" step, per the contract: resolving to one
  vehicle id fetches fitment immediately.
- `components/vehicles/vehicle-fitment-result.tsx` — renders the resolved
  fitment, mirroring `<TyreSearchResults>`/`<TyreSearchResultsStaggered>`'s
  visual shape (one size block, or Front/Rear side-by-side). Handles the
  zero-fitment `fitments: {}` case explicitly (data-entry gap, not an
  error, per the contract) with a message + link back to `/tyres`'s manual
  size search, not a dead end. The "Shop tyres for this fitment" links
  reuse `lib/catalog/search-params.ts`'s `buildTyreSearchQuery` — the same
  utility staggered search pagination already uses — rather than a second
  param-construction path; no `zone` is ever included (`/tyres` resolves
  it itself from the cookie) and no explicit page beyond the utility's own
  default of `1`.
- `app/tyres/by-vehicle/page.tsx` — the picker's page shell (metadata +
  breadcrumb only; all data fetching lives in the client component below
  it). Linked from `/tyres`'s hub state and the site header nav. Not a
  per-vehicle SEO landing page — `Vehicle.slug` is reserved for a
  *possible* future vehicle-browse page per `01-task-breakdown.md`, not
  built this round.
- Judgment calls flagged, not nailed down by the contract: `series`/
  `body_type`/`year_to` modelled as nullable (the contract's own example
  doesn't show a null case for any of them); `confidence` typed as a free
  string rather than a guessed enum (only `"confirmed"` appears in the
  contract's example).
