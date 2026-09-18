---
name: project-host-docker-state
description: Pre-existing global containers on the dev host occupy ports 5432 and 8082, outside of any MTS compose file
metadata:
  type: project
---

As of 2026-09-10, `docker ps` on this dev machine shows two containers unrelated to the MTS project already running with host port bindings: `global_postgres` (postgres:latest, host port 5432) and `global_adminer` (host port 8082). These are not defined in any `MTS/` docker-compose file — they predate this project's compose setup and were already up when checked (Docker daemon confirmed responsive, `docker ps`/`docker --version` both returned cleanly; version 29.4.1).

**Why:** MTS's own compose stack will need MySQL (per project's stated stack, not Postgres) and possibly Adminer or another DB UI. If the MTS compose file naively maps MySQL to host port 5432 or a DB admin tool to 8082, it will collide with these already-running global containers.

**How to apply:** When scaffolding or editing `docker-compose.yml` at the MTS root, pick host-side port mappings that avoid 5432 and 8082 (e.g. map MySQL to a distinct host port like 3306 or 33061, and any admin UI to a port other than 8082), or confirm with the user whether these global containers should be stopped/reused instead. Re-verify with `docker ps` before assuming this state still holds, since it can change between sessions.
