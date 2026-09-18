# devops-agent memory index

- [User delegation style](user_delegation_style.md) — user hands over open infra decisions with options + reasoning, expects a clear chosen answer + exact copy-pasteable values, and trusts verified evidence over relayed claims.
- [Shared dev machine, port collisions](feedback_shared_dev_machine.md) — this host runs many unrelated client Docker projects; check `docker ps -a`/`netstat` before binding new host ports.
- [Parallel agent live sessions](feedback_parallel_agent_live_sessions.md) — backend/frontend agents often have live native dev servers running mid-session; verify before touching shared infra even when told coordination isn't required.
- [Docker Compose status (2026-09-11)](project_docker_compose_status.md) — root `docker-compose.yml`: redis/meilisearch/mailpit live; mysql/app/node staged AND profile-gated (`--profile staged` required) after a 2026-09-11 DB-collision incident.
- [Test DB isolation](project_test_db_isolation.md) — `backend/scripts/test-db.sh` gives concurrent test/E2E runs their own ephemeral MySQL schema; verified Laravel `--env` gotcha; corrected — real suite result is 226/224 passed/2 skipped/0 failed after fixing missing `APP_KEY` in `.env.testing`.
- [Validate failure root cause](feedback_validate_failure_root_cause.md) — don't call a failure "pre-existing/unrelated" just because repeated runs give the same count; that only proves determinism, not cause. Sanity-check that reported counts sum correctly.
- [MySQL workaround origin](project_mysql_workaround_origin.md) — bare `tiro-mysql` container was a user-directed Phase 0 stopgap, not backend-agent improvising; preserve its credentials on cutover.
- [Pre-existing host Docker state](project_host_docker_state.md) — `global_postgres` (5432) and `global_adminer` (8082) already run on the dev host outside MTS compose; avoid port collisions when building MTS's compose file.
- [Backend local MySQL switch](project_backend_local_mysql.md) — backend/ moved SQLite to MySQL 8 via standalone `tiro-mysql` docker container (port 3306, db `tiro`); not yet in compose; old sqlite file intentionally left orphaned.
- [Memory directory split](feedback_memory_directory_split.md) — a prior session wrote memory to root `MTS/.claude/agent-memory/devops-agent/` instead of here; this directory is now the consolidated/authoritative one as of 2026-09-11.
