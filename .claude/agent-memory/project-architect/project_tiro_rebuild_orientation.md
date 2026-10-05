---
name: project-tiro-rebuild-orientation
description: Where things live for the Tiro Mobile Tyres rebuild and how the docs/phase system works — read this first in any new session
metadata:
  type: project
---

Root workspace is `C:\zzz-shubham\MTS\` (two independent git repos, `backend/` and `frontend/`, no monorepo history — see root `CLAUDE.md`). This agent's cwd is `C:\zzz-shubham\MTS\frontend`, but the planning/architecture docs this role actually owns live at `C:\zzz-shubham\MTS\docs\` (sibling of `frontend/`, not inside it) — always use absolute paths, don't assume docs are under the frontend tree.

**Doc map this role maintains:**
- `docs/architecture/01-data-model.md` — entity field/index specs (grows per-phase, not rewritten)
- `docs/architecture/02-api-contract.md` — Next.js↔Laravel route/shape conventions (grows per-phase)
- `docs/architecture/03-integrations.md` — third-party vendor decisions
- `docs/architecture/04-booking-capacity-engine.md` — Phase 3 booking/slot design
- `docs/architecture/05-promotions-pricing.md` — Phase 5 promo design
- `docs/architecture/06-open-decisions.md` — numbered table, each blocking item states exactly what it blocks and whether engineering can proceed around it
- `docs/architecture/07-admin-auth-permissions.md` — RBAC matrix + Fortify/spatie design, source of truth for `RolesAndPermissionsSeeder`
- `docs/plan/00-roadmap-overview.md` / `01-task-breakdown.md` — phase list and per-phase task tables with owner/sign-off

**Standing pattern across every phase so far (Phase 0 auth, Phase 1 catalogue/location, Phase 2 vehicles, Phase 3 booking):** this role gets invoked as a pre-phase "implementation-readiness pass" — read the phase's architecture sections + task table + open-decisions, verify against actual code state (not just doc state, they drift), fix real gaps **directly in the docs** (not a separate report file), and hand back a concise summary to project-manager. See [[feedback-readiness-pass-style]] for how the user wants this done.

**Recurring verification habit that has paid off every pass:** doc text and actual backend code state diverge — things get scoped in a phase's task table as "build this" and then genuinely never get built (confirmed by grepping `backend/app` / `backend/database/migrations`, not by trusting the doc's own status snapshot). Always verify claims like "already built" or "already seeded" against the actual repo before relying on them. Phase 3's pass found two such gaps: the `Idempotency-Key` middleware and the generic reservation/hold-with-TTL mechanism were both scoped in Phase 0's task table but never implemented — see [[project-phase3-booking-capacity-readiness]].

RBAC convention: `backend/database/seeders/RolesAndPermissionsSeeder.php` is the actual source of truth for what's seeded (`MODULES` const + `ROLE_MODULE_TIERS` const) — cross-check the doc's permission matrix against this file directly each phase, don't assume the doc and the seeder stayed in sync.
