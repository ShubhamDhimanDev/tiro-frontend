# QA Lead Memory Index

- [Backend quality-gate composition](backend_quality_gate.md) — `composer test` = config:clear + pint --test + phpstan (level 7) + isolated pest; phpstan needs `--memory-limit` override locally.
- [No git history in either repo](no_git_history.md) — backend/frontend have zero commits as of 2026-09-11; can't diff to isolate "changed this phase" from pre-existing.
- [Phase 1 sign-off (2026-09-11)](phase1_signoff_2026-09-11.md) — outcome and why, first standing sign-off request handled.
- [Testing-best-practices skill location](testing_best_practices_skill_location.md) — vendored via Laravel Boost, not the global skills dir.
