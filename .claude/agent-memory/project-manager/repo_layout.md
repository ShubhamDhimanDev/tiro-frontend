---
name: repo-layout
description: Where docs, backend, and frontend actually live on disk in the MTS workspace — corrects an easy path assumption mistake
metadata:
  type: reference
---

Root is `C:\zzz-shubham\MTS`. Two independent git repos side by side: `backend/` (Laravel 13 + Inertia admin panel) and `frontend/` (Next.js storefront). No monorepo git history — see root `CLAUDE.md`.

**Architecture and planning docs live at the ROOT, not inside `backend/`:**
- `C:\zzz-shubham\MTS\docs\architecture\*.md` — e.g. `08-customer-auth-otp.md` (customer auth/OTP design, current as of the 2026-09-09 password+OTP revision), `01-data-model.md`, `02-api-contract.md`, `07-admin-auth-permissions.md`.
- `C:\zzz-shubham\MTS\docs\plan\*.md` — `00-roadmap-overview.md`, `01-task-breakdown.md` (phase-by-phase task table with owner + sign-off columns), `02-dependency-blockers.md`, `05-auth-implementation-plan.md`.

`backend/docs/` does not exist — don't guess that path. `backend/CLAUDE.md` is Laravel-Boost-generated guidelines, separate from these architecture docs.

This project-manager's own memory directory is at `C:\zzz-shubham\MTS\frontend\.claude\agent-memory\project-manager\` even though it conceptually covers both `backend/` and `frontend/` — it's just where the harness put it (frontend's cwd is the default root). Not a signal that this role is frontend-specific.

See [[project_customer_auth_slice]] for the current feature this layout was learned while working on.
