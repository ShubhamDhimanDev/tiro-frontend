---
name: project-phase3-booking-capacity-readiness
description: Findings/decisions from the 2026-09-18 Phase 3 (Booking & Capacity Engine) implementation-readiness pass
metadata:
  type: project
---

Phase 3 readiness pass completed 2026-09-18, following the same pattern as prior phases ([[feedback-readiness-pass-style]]). Phase 2 (Vehicle Identification) was already signed off and committed going in.

**Key findings, in case a later session needs the "why" without re-deriving it:**

1. **Two Phase 0 infra items were scoped but never built**: the generic `Idempotency-Key` middleware and the generic reservation/hold-with-TTL mechanism (both listed in Phase 0's task table, Phase 0's own status snapshot said non-auth rows "remain exactly as originally scoped" — confirmed absent from `backend/app` by direct search). Both are real Phase 3 prerequisites now, not pre-existing infra to build on top of. Added as explicit Phase 3 task rows. See `docs/architecture/06-open-decisions.md` item 15.
2. **Redis was already anticipated for this exact phase** — `docker-compose.yml` has a live-but-non-load-bearing `redis` service with a header comment saying "load-bearing from Phase 3." `backend/.env` still uses `database` for cache/queue/session. Decided (not escalated, architecturally-correct call): switch to `predis` (not the `.env.example` default `phpredis`) because backend-agent runs native `php artisan serve` on Windows, not the Docker `app` container — `phpredis` would need a compiled extension on that host, `predis` is a pure-PHP Composer package.
3. **`Booking.address_id` was wrong in the original data-model sketch** — modeled as required, but the customer journey (requirements §2) selects an appointment (step 5, only needs zone+date) before capturing the street address (step 6, checkout). Corrected to nullable, backfilled at Order-creation time in Phase 4.
4. **`CancellationPolicy` was referenced conceptually in `04-booking-capacity-engine.md` ("build the policy as data") but never actually given a schema** — added it this pass, seeded with one permissive global default row so the reschedule/cancel mechanism isn't blocked on open decision #2's real fee/notice numbers.
5. **RBAC checked out clean, unlike Phase 2's Vehicles module** — the `bookings` module (including `bookings.view-own` for the technician role) was already fully present in `backend/database/seeders/RolesAndPermissionsSeeder.php`, matching `docs/architecture/07-admin-auth-permissions.md`'s matrix exactly. No gap-filling needed here, confirmed by reading the seeder directly, not just the docs.
6. **Technician-scoped-login deferral (Phase 0 → Phase 3) confirmed still accurate** — the task's stated blocker (needs real `Technician`/`Booking` tables + `BookingPolicy` against real rows) still holds; nothing about it changed except that its RBAC prerequisite turned out to already be satisfied (point 5).
7. Designed concretely (previously only conceptual): the slot-computation query shape/index usage, the job-duration formula's exact arithmetic (base + per-tyre-by-category + per-run-flat-tyre + per-booking addons + staggered, with `run_flat`/`staggered` derived from cart data rather than customer-selected), and the hold-with-TTL mechanism (Redis `Cache::lock()` for race prevention + delayed job + scheduled sweep for expiry, unified behind a `HasHold` contract so Phase 5's promo-stock hold reuses it without a second implementation).

Verdict handed to the user: Phase 3 docs are implementation-ready after this pass's edits; `composer test` (Pint + phpstan level 7 + Pest) was confirmed still green as of the Phase 2 cleanup (2026-09-18, qa-lead re-sign-off) — bar for Phase 3 is "stays at 0 errors."

Docs touched this pass: `docs/architecture/01-data-model.md`, `docs/architecture/02-api-contract.md`, `docs/architecture/04-booking-capacity-engine.md`, `docs/architecture/06-open-decisions.md`, `docs/plan/01-task-breakdown.md`.
