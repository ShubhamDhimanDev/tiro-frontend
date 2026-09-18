---
name: feedback-shared-dev-machine
description: This machine runs many unrelated client Docker projects concurrently — always check for port/container collisions before binding new ports
metadata:
  type: feedback
---

The local Windows dev machine (`c:\zzz-shubham\MTS` is one of several projects on it) has dozens of Docker containers from unrelated client projects — some running, most stopped — visible in a bare `docker ps -a`. Observed 2026-09-10: containers/host ports already claimed by other projects included Postgres on 5432, Adminer on 8080/8082, and various stopped Redis/MySQL containers that could reclaim 6379/3306 if restarted. Reconfirmed 2026-09-11: `docker ps -a` still shows many unrelated exited MySQL containers from other projects (`integration-mysql-1`, `booking_app-mysql-1`, `gdgoenka-*-db-1`, `shopify-platform-mysql`, `global_mysql`) that default to port 3306 — none currently running, but any of them restarting would contest MTS's own MySQL port too, not just MTS's own compose services contesting each other.

**Why:** This isn't a dedicated CI/dev VM scoped to one project — port defaults (3306, 5432, 6379, 8080, 8025, etc.) are contested across projects sharing this one host, not just within Tiro's own stack.

**How to apply:** Before adding a new service to `docker-compose.yml` or running a one-off `docker run`, check `docker ps -a` and `netstat -ano` for the intended host port first. Prefer the project's already-established port (e.g. Tiro's Meilisearch on 7700, MySQL on 3306 per its existing `.env`) over picking arbitrary new ones, but verify it's actually free on this specific machine at the time, don't assume from convention alone. See [[project-docker-compose-status]] for how MTS's own `mysql` service getting profile-gated (2026-09-11) addresses the in-project collision risk, though it doesn't protect against an unrelated project's container claiming 3306 first — if that ever happens in practice, moving `tiro-mysql` off the default 3306 to something distinctive is the next lever (not done yet, would require coordinating with backend-agent since it's mid-use).
