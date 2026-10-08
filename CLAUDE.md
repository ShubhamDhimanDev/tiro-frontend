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

## Cart, checkout & payments (Phase 4)

Implementation follows `docs/architecture/02-api-contract.md`'s "Cart,
Checkout & Payment endpoints" section (added 2026-09-22) and
`docs/architecture/01-data-model.md`'s Commerce section. Verified directly
against the real backend this round (`CartController`, `OrderController`,
`StoreOrderRequest`, `CartCalculateRequest`, `routes/api.php`) rather than
trusting the doc alone, same posture every prior phase documents for itself.

- **`lib/cart/` supersedes Phase 3's `lib/booking/selection.ts` stopgap,
  deleted this round** (along with `components/booking/selection-provider.tsx`,
  `add-to-booking-button.tsx`, `booking-selection-summary.tsx`) — that
  file's own doc comment said superseding it "should mean deleting this
  file, not extending it," and Phase 4's contract confirms the localStorage-
  backed, no-server-side-`Cart`-entity design is *permanent*, not a gap this
  phase was meant to close. `lib/cart/cart.ts` is the same pure logic,
  renamed; `components/cart/cart-provider.tsx` (`useCart()`) is the renamed
  context, wrapping the whole app from `app/layout.tsx` in place of
  `<BookingSelectionProvider>`. `components/booking/booking-flow.tsx` now
  reads cart state via `useCart()` — Phase 3's slot-pick/hold flow itself is
  otherwise unchanged, per the task brief.
- `lib/cart/backend.ts` / `lib/orders/backend.ts` default to live, same
  "verified against the real controller, live by default" posture as
  `lib/vehicles/backend.ts`/`lib/booking/backend.ts`. Set
  `CART_BACKEND=stub` / `ORDERS_BACKEND=stub` to opt back into the in-memory
  stubs (both explicitly decoupled from `lib/booking/backend-stub.ts`'s
  in-memory bookings — see each stub's own doc comment for why and what
  that costs in fidelity for `cart/calculate` mode 2 / order creation).
- `app/cart/page.tsx` (`<CartFlow>`) — cart contents priced live via
  `POST /api/v1/cart/calculate` mode 1, debounced ~350ms per edit (not
  specified by the contract; judgment call). Renders every field the
  response returns (`subtotal`/`discount_total`/`tax_total`/
  `service_fee_total`/`grand_total`, via `components/cart/cart-totals.tsx`,
  reused unmodified by the checkout order-summary and order-confirmation
  views) even though `discount_total`/`service_fee_total` are flat `0` this
  phase — the shape is already final, Phase 5 only changes the numbers.
- **Booking-to-order sequencing matches the contract exactly**: the cart
  page never itself creates anything; Phase 3's existing slot-pick ->
  `POST /api/v1/bookings` flow turns cart contents into a `pending_hold`
  `Booking`, and `<BookingHoldPanel>` gained a "Continue to checkout" link
  (`/checkout?booking={id}`) as this round's only change to that component.
  `app/checkout/page.tsx` re-verifies the booking authoritatively on mount
  (`GET /api/booking/{id}`, the same proxy `<BookingFlow>` already uses) —
  a bookmarked/shared checkout link degrades safely rather than trusting a
  stale id, same posture as the booking flow's own mount effect.
- `lib/orders/order-token-cookie.ts` is a near-verbatim copy of
  `lib/booking/manage-token-cookie.ts`, retargeted at `Order`/`order_token`
  — per the task brief, a deliberate reuse of the identical httpOnly-cookie-
  server-proxy pattern, not a second mechanism. `app/api/orders/route.ts`
  strips `order_token` from the response the browser receives (storing it
  server-side) exactly like `app/api/booking/route.ts` does for
  `manage_token`, but deliberately does **not** strip `payment.client_secret`
  — that one secret is meant to reach client JS, Stripe's Payment Element
  model requires it.
- `app/orders/[order]/page.tsx` (`<OrderStatusView>`) doubles as the guest
  order-tracking view (task brief: "reusing the exact same pattern as the
  existing guest booking-manage flow") — a guest revisiting this URL in the
  same browser is authenticated transparently via the httpOnly `order_token`
  cookie already set at checkout; a different browser/device has no
  recovery path this phase, same known/carried-forward gap
  `Booking.manage_token` has until Phase 7's confirmation email/SMS exists.
  Short-polls `payment_status` a few times if still `pending` on load
  (webhook confirmation is async and can genuinely lag the redirect back
  from Stripe) rather than assuming it's settled by the time this page
  renders.
- **Stripe** (`components/checkout/stripe-payment-step.tsx`): one
  `<PaymentElement>` covers cards/Apple Pay/Google Pay/Afterpay per the task
  brief, client-confirmed via `stripe.confirmPayment({redirect: "if_required"})`
  against the `client_secret` `POST /api/v1/orders` already returned.
  `app/checkout/return/page.tsx` is the `return_url` target for the one
  method that's redirect-mandatory (Afterpay) — it only forwards to
  `/orders/{id}` using this app's own `order` query param, never trusting
  Stripe's appended params, since the confirmation page re-fetches
  authoritative state anyway. **Blocked on missing keys, flagged per the
  task brief**: no `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` exists anywhere in
  this workspace as of this round (backend's own `STRIPE_PUBLISHABLE_KEY`
  is blank too) — `lib/checkout/stripe-client.ts`'s `getStripePromise()`
  returns `null` in that case and the component renders a "payments aren't
  configured yet" state instead of mounting `<Elements>`. Structure/request
  flow is built; live rendering/confirmation is unverified.
- **Google Places Autocomplete** (`components/checkout/address-autocomplete.tsx`)
  — `docs/architecture/03-integrations.md` item 2, built this round (Phase 1
  shipped only a plain postcode/suburb text input for serviceability
  capture, explicitly deferring this). Classic `google.maps.places.Autocomplete`
  bound to an input, loaded via `next/script`, restricted to `country: "au"`.
  Same missing-key posture as Stripe — no `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
  exists yet, so this renders its manual-entry fallback fields directly
  rather than attempting to load the Maps script; the fallback is a real,
  fully-functional path (not just a placeholder), so checkout's address
  step is usable/testable end-to-end either way.
- **`suburb_id` resolution — the genuine contract gap flagged earlier this
  phase is now closed (2026-09-22 follow-up).** backend-agent built
  `GET /api/v1/suburbs?postcode=&name=` (both required; `422` on malformed
  postcode/missing param; `200` with `data: []` on no match; ambiguous
  name+postcode-across-two-states pairs returned unfiltered, not collapsed
  server-side — docs/architecture/02-api-contract.md's "`GET /api/v1/suburbs`
  — resolving a `Suburb.id`" section). `lib/suburbs/` is the new domain
  (`types.ts`/`backend-client.ts`/`backend-stub.ts`/`backend.ts`/
  `client-api.ts`, same live-by-default/`SUBURBS_BACKEND=stub` shape as
  every other domain), proxied through `app/api/suburbs/route.ts` — the
  browser never calls Laravel directly, same posture as the rest of
  checkout. `lib/checkout/address.ts`'s `resolveSuburbId()` is now async:
  calls the endpoint, filters `data` by `state === address.state` (`state`
  is `State.code`, the same short-code format Places' own
  `administrative_area_level_1` short name uses — no second lookup needed),
  and returns a `SuburbResolution` tagged union (`"resolved"` / `"no_match"`
  / `"ambiguous"` / `"lookup_failed"`) rather than a plain `null`, so
  `components/checkout/address-step.tsx` can show a distinct, honest message
  for each non-resolved case instead of one generic error. The lookup fires
  once per Places pick (keyed off `picked` in a `useEffect`, not on every
  line2/access-instructions keystroke — neither field affects suburb
  resolution). `UNRESOLVED_SUBURB_ID` (`0`, which can never satisfy
  `exists:suburbs,id`) is still the value actually submitted for any
  non-`"resolved"` outcome, same reasoning as before: let the server's own
  validation say so rather than guess a real id.
- Vehicle/rego capture (requirements §6): `components/checkout/vehicle-step.tsx`
  captures rego/state (required text/select) plus an optional
  `components/checkout/checkout-vehicle-picker.tsx` — a lighter make/model/
  year cascade than `components/vehicles/vehicle-picker.tsx` (resolves a
  `vehicle_id` only, no fitment fetch; checkout doesn't need fitment) kept
  as its own component rather than bolting a second mode onto the existing
  picker. Per `StoreOrderRequest`'s own docblock, `rego`/`state` are
  shape-validated but not persisted anywhere server-side this phase — only
  `vehicle_id` survives (backfilled onto the linked `Booking`) — so this UI
  deliberately doesn't build any "you'll see this again later" expectation
  around rego/state.

## Promotions & price-guarantee claims (Phase 5)

Implementation follows `docs/architecture/02-api-contract.md`'s "Promotions
& Price-Guarantee endpoints" section (Phase 5, added 2026-09-22) and
`docs/architecture/05-promotions-pricing.md`. Verified directly against the
real backend this round (`PricingLine`/`PricingResult`,
`PriceGuaranteeClaimController`, `StorePriceGuaranteeClaimRequest`,
`PriceGuaranteeClaimResource`, `routes/api.php`) rather than trusting the
doc alone, same posture every prior phase documents for itself — the field
shapes matched the doc exactly this round (`applied_promotion: { id, name,
type }` per line, `applied_promotions: [{ id, name, type, discount_amount }]`
cart-level), no gaps found.

- **Cart/checkout promo display** — `lib/cart/types.ts` gained
  `AppliedPromotionLine`/`AppliedPromotionSummary` and the corresponding
  `CartLine.applied_promotion`/`CartCalculateData.applied_promotions` fields,
  both modelled as *required* (never optional/omittable) to match the
  contract's "always present, never omitted" convention — same posture
  `manage_token_issued` already established. `components/cart/cart-line-items.tsx`
  renders a small green badge under any line with a non-null
  `applied_promotion` (its `name`, e.g. "4 for 3 — Select Bridgestone`).
  `components/cart/cart-totals.tsx`'s `<CartTotalsSummary>` gained an
  optional `appliedPromotions` prop: when present and `discount_total > 0`,
  the discount row relabels "Discount" → "You saved" and a per-promotion
  breakdown (`name`/`discount_amount`) renders underneath — reading fields
  straight off the API response, nothing computed client-side. The prop is
  optional because `OrderRecord` (the order-confirmation page's own totals
  shape) has no `applied_promotions` equivalent — `<OrderStatusView>` just
  omits it and still gets the discount total, never a broken render. Both
  callers that *do* have it (`components/cart/cart-flow.tsx`'s mode-1 cart
  page, `components/checkout/checkout-flow.tsx`'s mode-2 order summary) now
  pass `calc.data.applied_promotions` through. `lib/cart/backend-stub.ts`
  updated in lockstep (`applied_promotion: null`, `applied_promotions: []`)
  so the stub still type-checks and exercises the "nothing applies" render
  path — it does not replicate the promotions evaluation engine itself
  (eligibility matching, 4-for-3 pooling), only the response shape, same
  "good enough for the UI, not a faithful replay of backend logic" posture
  every other stub in this app documents for itself. **No promo-code entry
  field anywhere** — deliberate, per decision #18 in
  `docs/architecture/06-open-decisions.md`; all promotions are auto-applied
  from cart contents/zone/date, there's nothing for a customer to type.
- **Price-guarantee claims** — new `lib/price-guarantee/` domain
  (`types.ts`/`backend-client.ts`/`backend-stub.ts`/`backend.ts`/
  `client-api.ts`), same five-file shape as every other domain, live by
  default (`PRICE_GUARANTEE_BACKEND=stub` opts into the in-memory stub).
  **Structurally different from every other domain in this app**: both
  upstream endpoints are `auth:customer`-only with no guest/manage-token
  fallback at all (a deliberate scoping decision, not a gap — see
  `05-promotions-pricing.md`), so `backend-client.ts`'s `token` parameter is
  required, not optional, and there's no `Idempotency-Key` handling (also
  deliberate — a duplicate claim from a double-submit is an admin-queue
  nuisance, not a money bug, confirmed out of scope by the architecture doc).
  `app/api/price-guarantee-claims/route.ts` proxies both verbs and
  short-circuits to `401` before ever calling the backend if there's no
  session cookie, mirroring `app/api/orders/[id]/route.ts`'s `403`
  short-circuit pattern for the equivalent "credential we already know is
  missing" case.
  - `components/price-guarantee/claim-form.tsx` — the submission form
    (`competitor_url`, `competitor_price` entered in dollars and converted
    to cents client-side before submit, `tyre_variant_id`, optional
    `order_id`). Gated on `useAuth()`: signed-out renders a "log in to
    continue" prompt instead of a form that would only fail on submit — UX
    only, the Route Handler's own `401` is the real boundary, same "hides
    what a user can't use, never the security boundary" posture the admin
    panel's permission-aware nav already documents. `tyre_variant_id` is
    never a manually-typed field — it's always supplied by the caller from
    a real entry point (below), never invented by this form.
  - `components/price-guarantee/claims-list.tsx` — "my claims" list
    (`GET /api/v1/price-guarantee-claims`, own claims only, paginated
    server-side), same `useAuth()` gate, renders `status` via
    `<ClaimStatusBadge>` plus `admin_note` on rejection and
    `approved_discount_amount`/`expires_at`/`redeemed_at` on approval.
  - `app/price-guarantee-claims/page.tsx` (static — no dynamic API reads,
    all data-fetching is client-side inside `<PriceGuaranteeClaimsList>`)
    and `app/price-guarantee-claims/new/page.tsx` (dynamic — reads
    `?tyre_variant_id=&order_id=&label=` via the `searchParams` Promise,
    same pattern `app/checkout/page.tsx` already established for `?booking=`).
    A direct hit on `/price-guarantee-claims/new` without a valid
    `tyre_variant_id` renders guidance back to a real entry point rather
    than a broken/empty form.
  - **Two entry points**, both gated to only render for a signed-in
    customer (`useAuth()`, same posture as the form/list above) since
    there's no useful guest action to offer here:
    `components/catalog/pdp-price-match-link.tsx` (pre-purchase, no
    `order_id`, wired into `app/tyres/[slug]/page.tsx` next to
    `<PdpAvailability>`) and an equivalent link added per line item inside
    `components/orders/order-status.tsx` (post-purchase, carries `order_id`
    — correctly absent for a guest tracking their order via `order_token`,
    since guests have no claim path regardless of how they're viewing the
    order). Neither `OrderLineItem` nor this claim flow carries a real tyre
    name/model — the order-line entry point's `label` falls back to
    `Tyre variant #{id} (order {order_number})`, same limitation
    `<OrderStatusView>`'s own item rendering already has, not a new gap.
  - `components/auth/auth-status.tsx` gained one link ("Price-match claims")
    next to the signed-in customer's name, pointing at
    `/price-guarantee-claims` — the minimum necessary for the feature to be
    discoverable at all, not a broader account-section build-out (that's
    still Phase 7 territory).

## Content (CMS) & ISR on-demand revalidation (Phase 6)

Implementation follows `docs/architecture/02-api-contract.md`'s "Content
(CMS) endpoints" and "ISR on-demand revalidation webhook" sections (Phase 6,
added 2026-09-23) and `docs/architecture/01-data-model.md`'s "Content / CMS
& Reporting" section. Verified directly against the real backend this round
(`ContentPageController`, `FaqController`, `ContentPageSummaryResource`,
`ContentPageDetailResource`, `FaqResource`, `ContentPage`/`Faq` models) —
routes registered, migrations run and exercised end-to-end against a
locally seeded DB (listing/detail/faqs happy paths, 404-on-draft,
404-on-nonexistent, 422-on-missing-`type`, unmatched-filter-is-200-empty —
every response shape matched the contract's documented JSON exactly, no
gaps found this round, unlike some prior phases' first passes.

- **`lib/content/`** — new domain, same five-file shape as every other
  domain (`types.ts`/`backend-client.ts`/`backend-stub.ts`/`fixtures.ts`/
  `backend.ts`), live by default (`CONTENT_BACKEND=stub` opts into the
  in-memory stub). `lib/content/seo.ts` holds the `meta_title`→`title`/
  `meta_description`→`excerpt`/`og_image_path`→`featured_image_path`
  fallback chain — confirmed this round that the live API does **not**
  resolve these server-side (`ContentPageSummaryResource`'s own doc
  comment says so explicitly, and a live response confirmed it: raw
  `null`s came back, not pre-resolved values), so the fallback belongs
  here, applied once, not duplicated at every page's `generateMetadata`.
  `lib/content/tags.ts` is the single source of truth for the ISR tag
  vocabulary string-building (`content:{type}`, `content:{type}:{slug}`,
  `content:faq`, `content:faq:{category}`, `content:faq:page:{id}`,
  `content:brand:{slug}`, `content:tyre:{slug}`, `promotion:{id}`) — every
  tagged fetch across this round imports from it rather than inlining
  template strings, so a typo can't silently desync frontend tags from
  what `App\Contracts\RevalidatesFrontend` implementations actually fire.
- **Routes built**: `app/blog/{page.tsx,[slug]/page.tsx}`,
  `app/guides/{page.tsx,[slug]/page.tsx}`, `app/locations/[slug]/page.tsx`
  (detail only — no listing, see its own doc comment), `app/promotions/[slug]/page.tsx`
  (promo landing, detail only, same reasoning), `app/pages/[slug]/page.tsx`
  (general static `page` type — routed under `/pages/{slug}`, not a bare
  root-level `/{slug}`, to avoid colliding with/needing to out-order every
  other literal top-level route this app already owns; flagged as a
  routing judgment call worth revisiting with project-architect if a
  literal root URL turns out to be a hard SEO requirement), `app/faq/page.tsx`
  (general FAQ page, groups the global-FAQ response by `category`
  client-side per the task brief, no filter params sent). All SSG/ISR,
  `revalidate = 3600` (same judgment-call default every other SSG/ISR page
  in this app uses), superseded per-tag by on-demand revalidation once
  Laravel's webhook fires.
- **No pagination or `?category=` filter UI** on the blog/guides listings
  this round — fetches the endpoint's own max `per_page=100` and renders
  everything unfiltered (category still shown per-card as a label). Reading
  `searchParams` to support either would force those pages into
  per-request dynamic rendering (this project's `cacheComponents` flag is
  off — see this file's Phase 1 section for the identical reasoning
  already applied to `<AuthProvider>`/`<LocationProvider>`), which would
  defeat the SSG/ISR mandate for exactly the page type this round exists
  to keep static. A category-scoped sub-route
  (`/blog/category/[category]`, itself SSG via `generateStaticParams`) is
  a clean follow-up if category browsing is ever actually requested.
- **`components/content/`** — `<FaqBlock category?, contentPageId?>` (an
  async Server Component, not a client fetch — FAQ content is exactly as
  cacheable/taggable as any other SSG/ISR content) is the one shared FAQ
  block the task brief asked for: wired into the PDP
  (`app/tyres/[slug]/page.tsx`, always `category="pdp"`, replacing Phase
  1's hardcoded `<PdpFaq>` placeholder — deleted this round, same "should
  mean deleting this file, not extending it" posture Phase 4 documents for
  its own superseded stopgaps) and location pages
  (`contentPageId={page.id}`, page-scoped). `<ContentPageBody>` is the
  shared title/excerpt/featured-image/body renderer for all five
  `ContentPage`-backed detail routes — `body` is rendered via
  `dangerouslySetInnerHTML` on the explicit assumption it's trusted,
  admin-authored HTML from an RBAC-gated internal surface, not user input
  (flagged in its own doc comment for security-agent if that assumption
  ever stops holding). No `@tailwindcss/typography` plugin is installed
  project-wide, so `body`'s rendered HTML gets a small hand-rolled
  `.cms-body` rule set in `app/globals.css` instead of pulling in a new
  dependency for a handful of tag rules.
- **`components/seo/json-ld.tsx`** gained `LocalBusinessJsonLd` — closes
  the one structured-data gap the Phase 1 round explicitly flagged in this
  same file's doc comment ("LocalBusiness/Service is for location content
  pages... out of scope this round"). Wired into
  `app/locations/[slug]/page.tsx` only, `areaServed` reading
  `service_zone.name` when linked, falling back to the page's own `title`
  otherwise (an unserviced-yet-suburb "coming soon" location page has no
  `service_zone` at all, per `01-data-model.md`'s Content section).
- **Retrofits, per the task brief's mandatory tag vocabulary table**:
  - `app/tyres/[slug]/page.tsx` (the PDP) — its one static-content fetch
    now carries `content:tyre:{slug}`.
  - `app/brands/[slug]/page.tsx` — its `catalogBackend.brands()` fetch now
    carries `content:brand:{slug}`. That fetch hits the exact same
    `/api/v1/brands` URL for every brand's page (no dedicated per-brand
    endpoint exists), so the one shared cache entry ends up carrying every
    visited brand's tag cumulatively — correct, not over-broad, since a
    `Brand` edit changes what that one shared response returns for every
    consumer of it, not just the edited brand's own page.
- **Promo-landing double-tagging (`content:promo_landing:{slug}` +
  `promotion:{id}`) — implemented with a flagged, honestly-documented
  limitation**, not silently claimed airtight.
  `app/promotions/[slug]/page.tsx`'s `loadPromoLanding()` issues a second,
  identically-shaped fetch (tags now including `promotion:{id}`) once the
  first resolves and reveals whether a `Promotion` is linked — verified
  directly against Next 16's actual fetch-cache implementation
  (`node_modules/next/dist/esm/server/lib/patch-fetch.js`) that every
  `fetch()` call unconditionally contributes its own `next.tags` into the
  current route's aggregate tag set regardless of cache hit/miss, so a
  `promotion:{id}` revalidation *does* reliably queue this page for
  regeneration. What it does **not** guarantee — confirmed by reading the
  same source, not assumed — is that the specific `pageDetail()` fetch's
  own persisted data-cache entry is itself retagged retroactively (that
  entry's tags were fixed at its first, pre-promotion-known write), so a
  `Promotion`-only edit (no matching `ContentPage` touch) may still show
  the promo blurb's old name/value/dates for up to the existing
  `revalidate: 3600` window after the page itself regenerates — the same
  "best-effort, timed ISR window is the fallback safety net" posture the
  contract already states for the whole webhook mechanism, not a new gap.
  A `ContentPage` edit (the more common admin workflow when a promo
  campaign changes) invalidates this page's body/title/excerpt instantly
  either way, via the single, unambiguous `content:promo_landing:{slug}`
  tag. Flagging for project-architect/backend-agent in case the intended
  fix is instead having `Promotion::revalidationTags()` do the reverse
  lookup server-side after all — the contract's own text currently
  delegates that to the frontend specifically to avoid that lookup.
- **`app/api/revalidate/route.ts`** — new, the one inbound exception to
  this app's outbound-proxy `app/api/` convention. `X-Revalidate-Secret`
  checked via `crypto.timingSafeEqual` (length-checked first, same
  two-step shape PHP's `hash_equals()` uses internally) against
  `REVALIDATE_WEBHOOK_SECRET`; `422` on missing/empty `tags`; on success,
  `revalidateTag(tag, { expire: 0 })` per tag (not a `cacheLife` profile
  like `"max"` — **Next 16 breaking change from training-data-era
  Next.js**: `revalidateTag`'s single-argument form is deprecated and its
  real type signature now requires a second `profile` argument; verified
  directly against `node_modules/next/cache.d.ts` and the current docs
  rather than assumed. `{ expire: 0 }` is the documented choice for "the
  caller needs the data gone immediately and cannot use `updateTag`"
  — `updateTag` is Server-Action-only, unavailable from a Route Handler,
  and immediate freshness is this webhook's entire reason to exist).
- **Nothing stubbed this round** — the Content API was live and fully
  exercised before any frontend code was written (routes read directly,
  pending migrations run locally, test rows seeded via `tinker`, every
  endpoint/edge-case curled and compared against the contract). The one
  environment hiccup (Docker Desktop/the local MySQL container went down
  partway through this round, after live verification was already
  complete) only affected a later confirmation build, not the
  implementation itself — `npm run build` still succeeds cleanly with the
  backend unreachable, since every fetch call in this codebase already
  degrades to an empty/graceful state on a non-200 response rather than
  throwing (same defensive posture every prior domain's `backend-client.ts`
  already established).

## Customer Accounts & Notifications (Phase 7)

Implementation follows `docs/architecture/02-api-contract.md`'s "Customer
account endpoints" section (Phase 7, added 2026-09-24) and
`docs/architecture/01-data-model.md`'s Phase 7 additions to
`CustomerVehicle`/`Address`. Backend-agent's build for this phase was
verified directly by the dispatching agent against real files before this
round started (per the task brief), not re-verified independently here —
same trust posture as any round where the brief itself states that. Only
the account-UI/checkout-prefill/mobile-format scope in the brief was built;
`NotificationLog`/email-SMS delivery (the other half of this phase's name)
is entirely backend-owned — `App\Notifications\*`, queued, no endpoint or
UI surface for it in the contract — so nothing on that side was touched.

- **Three new domains, same five/six-file shape every prior domain
  established** (`types.ts`/`backend-client.ts`/`backend-stub.ts`/
  `backend.ts`/`client-api.ts`, plus a `display.ts` for the two with a
  computed-label convention): `lib/customer-vehicles/`,
  `lib/customer-addresses/`, `lib/customer-orders/`. Kept as three flat,
  independent domains rather than nested under one `lib/account/` folder or
  folded into the existing `lib/vehicles/`/`lib/orders/` domains — this
  matches the existing flat-domain-per-REST-resource convention (no nested
  `lib/` folders exist anywhere else in this app) and avoids conflating
  "saved vehicle on an account" with "vehicle identification/fitment
  picker" or "checkout order creation/tracking", which are genuinely
  different auth models and lifecycles even though the names are adjacent.
  Same `auth:customer`-only, no-guest-fallback, `token`-required posture as
  `lib/price-guarantee/` (the only prior domain shaped like this) — every
  `backend-client.ts` here takes a required `token`, every `client-api.ts`
  has an `unauthenticated` (`401`) result kind instead of `forbidden`, and
  every `app/api/customer/**` Route Handler short-circuits to `401` before
  a round trip to Laravel when there's no session cookie, mirroring
  `app/api/price-guarantee-claims/route.ts` exactly. Live by default
  (`CUSTOMER_VEHICLES_BACKEND=stub` / `CUSTOMER_ADDRESSES_BACKEND=stub` /
  `CUSTOMER_ORDERS_BACKEND=stub` opt into the in-memory stubs, same
  simplifications every stub in this app documents for itself — no real
  per-token scoping, and the addresses stub doesn't replicate the
  referenced-by-order `409` check since it has no real `Order`/`Booking`
  rows to check against).
- **`lib/http/proxy-response.ts`, new** — a small shared helper
  (`proxyResponse()`) used by every new `app/api/customer/**` Route
  Handler in place of the `NextResponse.json(result.body, {status:
  result.status})` one-liner every prior `app/api/**` proxy used directly.
  Needed because this phase's `DELETE` endpoints are the first ones this
  app proxies that can return a real `204 No Content` — confirmed directly
  against this project's own Node runtime (not assumed) that constructing
  a `Response`/`NextResponse.json` with a `204`/`205`/`304` status *and* a
  non-null body throws (`"Invalid response status code 204"`), per the
  WHATWG Fetch spec's "null body status" rule; `new Response(null,
  {status:204})` alone does not throw. `proxyResponse()` special-cases
  those three statuses to a bodyless response and behaves identically to
  the old direct call otherwise — every pre-existing proxy route was left
  as-is (no `body`-bearing status they return is in that null-body set),
  only the new hard-delete routes use it.
- **`app/api/customer/vehicles/**`/`addresses/**`/`orders`** — proxy routes
  for all seven upstream endpoints (list/create per resource, update/
  delete/set-default per item, plus the orders list). No single-item `GET`
  exists in the contract for vehicles or addresses (only
  list/create/update/delete/set-default) — `components/account/edit-saved-vehicle.tsx`/
  `edit-saved-address.tsx` resolve an id to a record by fetching the (small,
  per-customer-bounded, unpaginated) list client-side and finding the
  matching row, rather than inventing a `GET .../{id}` this app's own proxy
  would have to fake — same "the list is already small enough, no dedicated
  single-item fetch needed" reasoning the contract itself applies to
  `/vehicles/makes`-sized endpoints elsewhere.
- **`app/account/`** — new section: `/account` (a links-only landing,
  including a link to the pre-existing Phase 5 `/price-guarantee-claims`
  page so every account-only feature has one jumping-off point),
  `/account/vehicles` (list) + `/new` + `/[vehicle]/edit`,
  `/account/addresses` (list) + `/new` + `/[address]/edit`,
  `/account/orders` (list, linking each row to the existing
  `/orders/[order]` detail page — no new detail view, per the contract's
  "detail reuses `GET /api/v1/orders/{order}` unmodified" note).
  `app/account/layout.tsx` is furniture only (nav + `robots:
  {index:false}` for the whole subtree) — no `cookies()`/session read in
  it; every list/form component gates on `useAuth()` independently instead,
  same client-side-hydrated-session pattern `<PriceGuaranteeClaimsList>`/
  `<OrderStatusView>` already established, kept consistent rather than
  introducing a second, server-side auth-check convention for just this
  subtree.
- **`components/account/saved-vehicle-form.tsx`** — add/edit form,
  `saved_fitment` sourced from one of two mutually exclusive modes matching
  the contract's two documented shapes exactly: "Look up my vehicle"
  (`<SavedVehicleFitmentPicker>`, a third make/model/year cascade variant
  alongside `<VehiclePicker>`/`<CheckoutVehiclePicker>` — this one needs
  both a resolved `vehicle_id` *and* the fetched `fitments` object handed
  back to the caller unmodified, which neither existing picker exposes; same
  "a third narrow variant beats bolting a third mode onto either existing
  one" tradeoff `<CheckoutVehiclePicker>`'s own doc comment already accepted
  for itself) or "Enter tyre size manually" (typed `all` or `front`+`rear`
  integers). Editing an already-vehicle-linked row shows the existing
  vehicle+fitment summary with a "Change vehicle" button rather than forcing
  a fresh cascade run every time.
- **Checkout prefill (frontend-only, per the task brief's explicit
  constraint — `POST /api/v1/orders`'s `address`/`vehicle` objects are
  unchanged, no `saved_address_id`/saved-vehicle input mode exists or was
  added)**: `components/checkout/address-step.tsx` gained an optional
  `savedAddresses` prop — a select above the existing Google Places picker;
  choosing a saved address skips the Places/`resolveSuburbId()` round trip
  entirely (a saved address already carries a resolved `suburb_id`/`lat`/
  `lng`) and prefills every field the step already emits, while
  `line2`/`access_instructions` stay locally editable either way. Same idea
  applied to `components/checkout/vehicle-step.tsx` (`savedVehicles` prop,
  prefills `rego`/`state`/`vehicle_id` — `<CheckoutVehiclePicker>` resolving
  a *different* vehicle afterward resets the saved-vehicle select back to
  "Enter vehicle details" so the two `vehicle_id` sources never visibly
  disagree with what's actually being submitted). Both default to the
  pre-Phase-7 behaviour unchanged when the prop is empty/omitted (guest
  checkout, or a signed-in customer with nothing saved yet).
  `components/checkout/checkout-flow.tsx` fetches both lists once on mount
  only when `useAuth()`'s `customer` is present, silently ignoring fetch
  failure (a convenience prefill, not core to placing an order).
- **`customer.mobile` E.164 gap fix** — `StoreOrderRequest.customer.mobile`
  now strictly enforces E.164 server-side
  (`regex:/^\+[1-9]\d{6,14}$/`, confirmed by reading the real
  `StoreOrderRequest` file directly, not assumed from the task brief alone)
  where it was previously shape-only. `lib/checkout/phone.ts`'s
  `formatAuMobileToE164()` is a pure function handling every AU-local shape
  a customer plausibly types (`04XX XXX XXX`, with/without spaces, `61...`
  without a `+`, the `0011 61...` international-dialling prefix, a bare
  9-digit mobile with no leading `0`) plus already-E.164 input passed
  through unchanged; returns `null` (rather than guessing) for anything it
  can't confidently normalize. Applied once, in
  `components/checkout/checkout-flow.tsx`'s `handleSubmit`, right before
  `POST /api/v1/orders` — deliberately **not** live-reformatted on every
  keystroke in `<ContactStep>`'s mobile field, which would fight the
  customer's own typing/cursor position for no real benefit; an
  unformattable non-empty value blocks submission with an inline
  `customer.mobile` field error instead of letting a malformed value reach
  the wire and `422`.
- **Judgment calls, flagged rather than silently decided**: no pagination
  UI on `/account/orders` this round (the contract paginates
  `GET /api/v1/customer/orders`, `lib/customer-orders/types.ts` models the
  full envelope, but `<OrderHistoryList>` renders page 1 only) — the task
  brief asked for a list "linking to order detail," not full pagination
  controls; a cheap, contained follow-up once a real account has enough
  history to need it. No profile-edit (name/email/mobile) UI added to
  `/account` — not in the endpoint list this round, out of scope.

## Reviews storefront UI & Help Centre index (Phase 8)

Two independent items this round, per the task brief.

**Reviews** — `GET /api/v1/reviews?page=&per_page=`, public/no-auth, built
against a `backend-agent` task running in the same round. `lib/reviews/`
is the new domain, same five/six-file shape as every prior domain
(`types.ts`/`backend-client.ts`/`backend-stub.ts`/`fixtures.ts`/
`backend.ts`/`tags.ts`) — but **stub is the default here**, the opposite of
every domain built since roughly Phase 2. Confirmed directly, not assumed:
`GET /api/v1/reviews` against the local Laravel dev server 404'd
(route-not-found) as of 2026-09-25/26, unlike every other domain this app
already talks to live — same "not yet exercised against a running backend"
posture `lib/catalog/backend.ts` documented for itself before Phase 1's
endpoints landed. Flip `REVIEWS_BACKEND=live` once backend-agent confirms
the real route (registered, response shape verified against the real
controller, not just a status report) — see `lib/reviews/backend.ts`'s own
doc comment. `lib/reviews/fixtures.ts` has 18 rows (ratings spread,
`reply_body` set on some, none representing a hidden/moderated-out review
since the contract excludes those server-side).

- `components/reviews/` — `<ReviewStars>` (text-glyph ★/☆, no icon
  dependency exists in this project), `<ReviewRatingBadge>` (reads
  `meta.summary.average_rating`/`total_count` straight off the response),
  `<ReviewCard>`, `<ReviewsCarousel>` (`"use client"` only for its
  Prev/Next `scrollBy` handlers — no client-side fetching, no carousel
  dependency), `<ReviewsPagination>` (a deliberate near-duplicate of
  `components/catalog/pagination-controls.tsx` rather than a shared import
  — this domain's paginator shape has no `last_page`, and cross-domain UI
  coupling isn't this app's convention; see Phase 7's identical
  "third narrow variant beats bolting on a second shape" reasoning).
- **Homepage widget** (`app/page.tsx`) — aggregate rating badge + a
  first-page (`per_page=8`) carousel, plus `OrganizationJsonLd`
  (`components/seo/json-ld.tsx`, new) with a nested `AggregateRating` when
  `total_count > 0`. The reviews fetch is tagged `reviews`
  (`lib/reviews/tags.ts`) with `revalidate: 86400` — *higher* than this
  route's own `revalidate = 3600`; per
  `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`'s
  "Revalidation frequency" note, the page itself still regenerates on the
  existing hourly cadence (driven by the `popularSizes` fetch), but the
  reviews fetch's own Data Cache entry is reused across most of those
  regenerations rather than re-fetched every time — matches the daily sync
  cadence the task brief asks for without slowing anything else down.
  Confirmed the homepage route is still fully static (`○`) in the build
  output after this addition, not forced dynamic.
- **`/reviews`** (`app/reviews/page.tsx`) — the full paginated list.
  Reads `searchParams` for `?page=` (a Request-time API under this
  project's classic caching model), so it builds as `ƒ` (dynamic), same
  posture `app/tyres/page.tsx` already established for the identical
  reason (a paginated list needs the page number at request time; there's
  no static param set to pre-generate against). This does **not** defeat
  the ISR posture the brief asks for: the underlying fetch still carries
  `next: { revalidate: 86400, tags: ["reviews"] }`, which opts that
  specific Data Cache entry into the same caching/tag-invalidation
  behaviour regardless of the route shell's own rendering mode — only the
  shell re-executes per request, not the upstream call.
- **Business reviews ARE shown on the PDP** (`app/tyres/[slug]/page.tsx`
  — `loadReviews()` fetches 3 reviews via `reviewsBackend`, rendered with
  `<ReviewRatingBadge>` + `<ReviewCard>`). *Decision reversed 2026-10-05:*
  Phase 8 originally kept reviews off the PDP because they are Google
  Business Profile reviews of the business as a whole, not of a specific
  tyre model. The product owner has decided to keep them on the PDP for
  now. Because they are business-level, the PDP block must be labelled as
  business/service reviews (e.g. "What customers say about Tiro") and must
  never be presented as product reviews; do NOT emit per-product
  `Review`/`AggregateRating` into the Product JSON-LD. Revisit if/when
  product-level reviews exist. (`components/reviews/review-card.tsx`'s doc
  comment still says "no reviews on the PDP" — update it alongside.)
- **Structured data scoped deliberately**: `OrganizationJsonLd` +
  `AggregateRating` (homepage, `/reviews`) and `BreadcrumbJsonLd`
  (`/reviews`, `/help`) only — no per-review `Review` schema anywhere, to
  stay inside the exact structured-data types the task brief named
  (Product, LocalBusiness/Service, FAQPage, BreadcrumbList) rather than
  reaching for one it didn't ask for.

**Help Centre index** — re-verified this round (a fresh `app/` glob) that
no combined help-centre/help route existed; `app/help/page.tsx` is new.
**Not a new backend build**, per the task brief: reuses
`GET /api/v1/content/pages?type=guide` and `GET /api/v1/content/faqs`
completely unmodified, through the same `contentBackend` and
`lib/content/tags.ts` tag vocabulary `app/guides/page.tsx`/`app/faq/page.tsx`
already use (`content:guide`, `content:faq`) — no new `lib/` domain, no new
tag string. SSG/ISR, `revalidate = 3600`, same default every other content
page in this app uses. Guides and FAQs are grouped by their own `category`
values **independently, in two separate sections** — `category` is
free-text on both `ContentPage` and `Faq` with no shared taxonomy between
them (a known content-authoring gap, not something to paper over in code),
so this deliberately never attempts to align/merge a guide's category with
a FAQ's category as if they were the same value space. Links out to
`/guides` and `/faq` for the full lists; embeds the actual FAQ Q&A content
directly (small/bounded, same as `<FaqBlock>`) rather than only linking to
it, plus a `FaqJsonLd` for the same items.

**Nav**: `app/layout.tsx` gained "Help" and "Reviews" links next to the
existing Blog/Guides/FAQ links — the minimum necessary for both new routes
to be discoverable, not a broader nav redesign.

**Pre-existing issue found and fixed, unrelated to either item above**:
`npm run lint` was failing (3000+ false-positive errors) because a
generated Playwright HTML report (`frontend/playwright-report/`, minified
trace-viewer JS bundles from a prior `test:e2e:report` run) was sitting in
the repo and isn't covered by any of `eslint-config-next`'s default
ignores (`.next`/`out`/`build` only) — `eslint.config.mjs`'s `globalIgnores`
gained `"playwright-report/**"`. Confirmed via a full non-truncated lint
run that every one of those errors/warnings was in that one generated
directory, none in this app's own source, before adding the ignore.

**Backend flakiness observed, flagged rather than chased**: mid-session,
previously-live endpoints (`/api/v1/content/faqs`, `/api/v1/content/pages`)
briefly started 404ing against the local Laravel dev server, and one
`npm run build` run failed with an uncaught `TypeError` in the pre-existing
`app/locations/[slug]/page.tsx`'s `generateStaticParams` (`result.body`
came back `200` but without the expected `.data` array mid-flake). A
same-command retry succeeded cleanly once the backend stabilized — this
app's existing `status !== 200 → []` guards don't cover the narrower
"`200` but unexpectedly-shaped body" case, a pre-existing gap in every
`generateStaticParams` built the same way (not introduced this round, not
touched this round either — flagging for backend-agent/project-manager
rather than expanding scope to patch every domain's static-params
resolver).

## Reviews follow-up fix-pass (2026-09-26) — nullability correction + flip to live

Prompted by project-manager cross-checking Phase 8's `lib/reviews/types.ts`
against backend-agent's now-real controller (`Review.php`, `ReviewResource`,
`SyncGoogleReviewsCommand::upsert()`'s own docblock) rather than assuming
the two independently-built sides still agreed — they didn't, on one point.

- **`Review.body`/`Review.review_url` were wrongly typed non-nullable**
  (`string`) in `lib/reviews/types.ts`; the real schema has both nullable
  (`@property string|null $body`, `@property string|null $review_url` on
  the real `Review` model). `review_url` in particular is expected `null`
  on essentially every real synced row, not a rare edge case: Google's
  actual `accounts.locations.reviews` v4 API doesn't appear to return a
  `reviewUrl` field at all, per the sync command's own docblock next to its
  `'review_url' => $review['reviewUrl'] ?? null` line. Both fields are now
  `string | null` with doc comments explaining why.
- **`components/reviews/review-card.tsx`** rendered the "View on Google"
  `<a href={review.review_url}>` completely unconditionally — a dead link
  on every real review card once `review_url` is null for essentially all
  of them. Now guarded the same way `reply_body` already was
  (`{review.review_url && (<a ...>)}`); `body`'s paragraph got the same
  guard for the same reason (a ratings-only Google review with no written
  comment is a real, valid row, not malformed data).
- **`lib/reviews/fixtures.ts`** — ids 37 and 20 now model `review_url:
  null` (id 20 also `body: null`, exercising both absent at once); the
  rest keep `review_url` set so the happy-path link still renders too.
  Doc comment updated to explain why, rather than just adding nulls
  silently.
- **`lib/reviews/backend.ts` flipped to live-by-default**
  (`REVIEWS_BACKEND=stub` now opts *into* the stub, matching the
  `=stub`-to-opt-out convention every other domain in this app uses — this
  was the one domain still inverted from before backend-agent's build
  landed). Confirmed directly before flipping, not just a status report:
  `routes/api.php`'s `Route::get('reviews', [ReviewController::class,
  'index'])` is registered, and `ReviewController::index()`/
  `ReviewResource`/`ReviewIndexRequest` were read directly — field names
  and `meta.summary.{average_rating,total_count}` nesting match
  `lib/reviews/types.ts` exactly, no other drift found beyond the
  nullability point above.

## Mobile layout rules (2026-10-08 mobile audit)

Full write-up, measurements and screenshots: `../docs/mobile-view-audit.md`. The rules below are the non-obvious ones
that cost real time to find, so please keep them when editing:

- **Never put an eager `<img>` in a `hidden`/`lg:block` wrapper.** It is still fetched on phones, and because Next
  prefetches `/` from the header logo, the home page's image-preload hint made *every* page download it (191KB). The
  desktop hero in `components/layout/hero-art.tsx` is a `<picture>` whose only real source is gated by
  `(min-width: 992px)`; its `<img>` is a blank-pixel data URI. The phone hero photo is a separate `next/image` that
  only the home hero asks for (`<HeroArt mobile />`).
- **Form controls must be 16px or larger on phones** (iOS Safari zooms the page when a smaller one takes focus):
  `<select>`s included. The finder selects (`components/catalog/tyre-search-form.tsx`) and the mobile Sort are 16px.
- **Skeletons:** keep a skeleton's height within about 60px of every state that replaces it, and do not swap a
  pulsing (`animate-pulse`) skeleton for a different element: Chrome scored that as a 250px layout shift on `/cart`
  (CLS 0.288 -> 0 with a static skeleton inside a persistent `min-h` wrapper). The page is static, so the server
  cannot know whether a visitor already has a location; see the comment on `PriceBlock` in
  `components/catalog/pdp-buy-panel.tsx`.
- **`Button` is no longer `whitespace-nowrap`**: long labels wrap on 320px phones instead of clipping. Grids that
  contain buttons or forms should use `grid-cols-[minmax(0,1fr)]` on phones so content cannot widen the column.
- **`TyreModelCard compact`** (results grid only) is a horizontal card below 576px and displays only its active face
  on phones, so the tall quantity panel does not set the card height. Tier columns and related products keep the
  stacked card.
- **Location chip:** its visible text must equal its accessible name (`locationLabel()`); the phone field wraps to two
  lines instead of truncating.
- **Not added on purpose:** `viewportFit: "cover"` (needs safe-area padding on every container or content sits under
  the landscape notch). `app/layout.tsx` sets `themeColor` and `interactiveWidget: "resizes-content"` only.
- Measure with a production build (`npm run build && npx next start`), not `next dev`. Scripts:
  `../docs/mobile-audit/scripts/` (see the report's appendix).
