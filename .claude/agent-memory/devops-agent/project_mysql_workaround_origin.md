---
name: project-mysql-workaround-origin
description: The bare tiro-mysql container from Phase 0 was a user-directed stopgap, not backend-agent improvising
metadata:
  type: project
---

During Phase 0 (admin + customer auth), backend-agent hit the missing Docker Compose deliverable (devops-agent's task, flagged blocking, never actually built) and needed a database. The user explicitly told backend-agent to stand up a one-off bare `mysql:8` Docker container rather than fall back to sqlite, because production runs MySQL and local dev needs to match it. Credentials landed in `backend/.env`: `DB_DATABASE=tiro`, `DB_USERNAME=root`, `DB_PASSWORD=tiro_local_dev_pw`, `DB_HOST=127.0.0.1`, `DB_PORT=3306`. Container name: `tiro-mysql`. As of 2026-09-11, `docker inspect tiro-mysql` shows `RestartPolicy: no` (it does not auto-restart on Docker daemon/Desktop restart — a manual `docker start tiro-mysql` is needed if it's ever down and native `php artisan serve` can't connect).

**Why this matters:** This was always a stopgap by explicit user design, not a gap in backend-agent's judgment or process — don't flag it as something backend-agent should have done differently. It's devops-agent's own overdue deliverable that created the need for the workaround in the first place.

**How to apply:** When consolidating this into the real `docker-compose.yml` (see [[project-docker-compose-status]]), preserve these exact credentials/database name so backend-agent's already-configured `.env` and any seeded data keep working without a reset — this was an explicit constraint from the user, not just a nice-to-have. The compose file's own `mysql` service already mirrors these exactly and is profile-gated (`staged`) as of 2026-09-11 specifically so it can't start and collide with this real container before the deliberate cutover happens.
