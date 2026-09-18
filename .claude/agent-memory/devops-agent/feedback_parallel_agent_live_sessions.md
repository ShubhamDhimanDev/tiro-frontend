---
name: feedback-parallel-agent-live-sessions
description: backend-agent/frontend-agent often have live native dev servers running mid-session — verify before touching shared infra, even when told coordination isn't required
metadata:
  type: feedback
---

On this project, backend-agent and frontend-agent are frequently mid-session with live, native (non-Docker) dev processes running in parallel with devops-agent's own work — e.g. observed 2026-09-10: `php artisan serve` bound to 127.0.0.1:8000 and `next dev` bound to :3000, both actively listening while devops-agent worked on Docker Compose in a separate thread. The user's framing ("no dependency on backend-agent's parallel work, you don't need to coordinate live") means devops-agent doesn't need to *ask permission* or wait — it does **not** mean it's safe to disrupt what's already running.

**Why:** Cutting over a shared resource those live sessions depend on (e.g. stopping a bare MySQL container serving an in-flight migration session, or claiming port 8000/3000 for a new container) risks silently breaking another agent's active work with no visibility into whether it's mid-transaction. The blast radius of an unannounced infra change is invisible to the agent making it. Concretely bore out 2026-09-11: two concurrent testers (backend-tester, frontend-tester) both hit real collisions against the shared `tiro-mysql` container/`tiro_testing` schema during round-3 testing — see [[project-docker-compose-status]] for the incident and fix.

**How to apply:** Before starting/stopping any container or rebinding a port, run `docker ps` / `netstat -ano` to check what's actually live right now. If something is live and would conflict, don't force a cutover — build/stage the new definition (e.g. in `docker-compose.yml`), validate it independently (e.g. `docker compose build`, or bind to an alternate port temporarily), and document the cutover as an explicit opt-in step for later rather than executing it mid another agent's session. As of 2026-09-11, "staged, not yet adopted" services (`app`, `mysql`, `node`) are now enforced via Compose `profiles: [staged]`, not just a header comment — don't run them with `--profile staged` while `tiro-mysql`/native `php artisan serve`/`next dev` are live without confirming with backend-agent/frontend-agent first, the flag existing doesn't make it safe, just intentional.
