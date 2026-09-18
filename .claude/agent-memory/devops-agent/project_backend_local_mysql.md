---
name: project-backend-local-mysql
description: backend/ was migrated from local SQLite to a standalone MySQL 8 docker container for local dev, matching production engine
metadata:
  type: project
---

As of 2026-09-10, `backend/` local dev was moved off SQLite onto MySQL 8, to match production (which runs MySQL) before a large customer-auth API build started on top of it. This was done with a plain `docker run` container, not docker-compose:

```
docker run -d --name tiro-mysql -e MYSQL_ROOT_PASSWORD=tiro_local_dev_pw -e MYSQL_DATABASE=tiro -p 3306:3306 mysql:8
```

`backend/.env` DB_* values now: `DB_CONNECTION=mysql`, `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_DATABASE=tiro`, `DB_USERNAME=root`, `DB_PASSWORD=tiro_local_dev_pw`. Port 3306 was confirmed free on the host before binding (no collision, unlike the 5432/8082 case in [[project-host-docker-state]]).

The old `backend/database/database.sqlite` file (434KB, last written 2026-09-09) was deliberately left in place, untouched/orphaned — not deleted. If it resurfaces in a `DB_CONNECTION=sqlite` env or someone asks "why is this file here," it's dead weight from before the MySQL switch, safe to ignore or clean up later but wasn't in scope to touch during the migration.

`migrate:fresh --seed` was re-run clean against the new MySQL DB: 6 roles, 21 permissions, 54 role_has_permissions pivot rows via `RolesAndPermissionsSeeder`. This container is standalone (`docker run`, no compose file) — it is NOT yet part of a project `docker-compose.yml`; that's still a separate future task per project constraints.

**Why:** Project standard is to develop against the same DB engine as production (MySQL) to avoid environment-specific bugs surfacing only at deploy time; SQLite was a leftover from an earlier session that hadn't been corrected yet.

**How to apply:** When eventually authoring the real `docker-compose.yml` for this project, this standalone `tiro-mysql` container should likely be replaced/superseded by a `mysql` service in compose (same DB name/creds are reasonable defaults to reuse for continuity, or ask the user if compose should generate fresh ones). Don't assume this container persists forever — it's a manual `docker run`, not part of any restart policy or compose lifecycle; if it's gone in a future session, that's expected, not a regression, and it should be recreated (or superseded by compose) rather than treated as evidence the DB engine decision was reverted.
