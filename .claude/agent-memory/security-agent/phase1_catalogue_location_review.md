---
name: phase1-catalogue-location-review
description: Outcome snapshot of the Phase 1 (Catalogue/Location/Serviceability) security review on 2026-09-11 — all three scoped items passed, plus what "good" looks like in this codebase for future comparison.
metadata:
  type: project
---

Phase 1 (Catalogue, Location & Serviceability Engine) security review
completed 2026-09-11, scoped to three items per the requesting agent's brief
(lighter-touch than Phase 0's auth review since this phase has no PII/payment
surface):

1. **Admin-CRUD permission gating (Products/Inventory/Locations) — PASS.**
   Every mutating route in `backend/routes/admin.php` sits inside a
   `permission:{module}.manage` middleware group. Most controllers also
   double up with FormRequest `authorize()` checks or inline
   `abort_unless($request->user()?->can(...), 403)` (defense in depth) —
   though `StockLocationController::destroy`, `InventoryItemController::destroy`,
   and `SuburbController::destroy` rely on route middleware alone (no
   in-controller check). That's still real server-side enforcement per the
   task's own standard, just stylistically inconsistent with sibling
   controllers — not a vulnerability, worth a passing mention only.

2. **Permission-slug-vs-seeded-name cross-check — PASS.** See
   [[permission_slug_source_of_truth]]. The Phase 0 `roles.manage` /
   `roles-users.manage` bug was already fixed by the time of this review, and
   every new Products/Inventory/Locations slug in both the frontend `<Can>`
   usage and backend middleware/authorize() calls matches the seeder exactly.
   There is also a dedicated test,
   `backend/tests/Feature/Admin/PermissionGateParityTest.php`, that asserts
   route-middleware and Gate-level denial parity for the roles-users module
   across the full role matrix — a good pattern to point `backend-tester` at
   if other modules need the same coverage.

3. **New public pricing fields on `GET /api/v1/tyres` /
   `/api/v1/tyres/latest-releases` — PASS.** `TyreVariantResource` only adds
   `unit_price` (= `base_price`), `promotional_price` (always `null`, no
   promotions engine yet), `currency`, and `stock_status`, each gated behind
   `$this->when($zoneResolved, ...)`. `tyre_variants` has no cost-basis/margin
   column at all (only `base_price`), so there's no adjacent field that could
   leak. `ZoneStockCalculator` exposes only an enum (`in_stock`/`limited`/
   `out_of_stock`/`unavailable_in_zone`), never raw on-hand/reserved
   quantities.

General pass also covered: no unsafe `DB::raw`/string-interpolated raw SQL
(all raw usages are static strings or parameterized), `composer audit` and
`npm audit` both clean, mass-assignment fillable lists are tightly scoped
(see [[mass_assignment_attribute_style]]), and the frontend's only
`dangerouslySetInnerHTML` use (`frontend/components/seo/json-ld.tsx`) is a
JSON-LD script tag with `<` escaped to `<` — safe.

No `NEXT_PUBLIC_*` env vars are in use in the frontend yet, so no secret-in-
bundle risk surfaced this round — worth re-checking once checkout/payment
env vars are introduced.
