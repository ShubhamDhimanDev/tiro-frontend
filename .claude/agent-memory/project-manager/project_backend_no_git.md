---
name: project-backend-no-git
description: backend/ has never had git initialized — this keeps causing real friction (not just a theoretical gap) for agents that scope tools to changed files
metadata:
  type: project
---

`backend/` (Laravel app) has no `.git` at all, unlike `frontend/` which is its own git repo with real (currently uncommitted) history. Root `CLAUDE.md` notes this could be "intentional (not yet initialized) or a real gap" and instructs project-manager not to initialize one unilaterally, just note if it blocks something.

**It has now actually blocked something, twice-observed as of 2026-09-10:** backend-agent's Laravel Boost guidelines tell it to run `vendor/bin/pint --dirty --format agent` after PHP changes — `--dirty` needs git to know what changed. With no `.git`, backend-agent falls back to a full-repo Pint pass, which cosmetically reformats unrelated files it never touched (e.g. one unrelated test file got its import style reformatted during the 2026-09-10 auth security fix pass — harmless, suite stayed green, but it's noise in any future diff review and will keep happening on every PHP-touching task until this is resolved).

**Why:** No monorepo git — `backend/` and `frontend/` are independent repos per root `CLAUDE.md`. It's unclear whether `backend/`'s missing `.git` was a deliberate choice (e.g. deploy pipeline reasons) or simply never done in that Laravel Boost scaffold.

**How to apply:** Don't silently work around this again (e.g. by memorizing which files were "actually" touched and manually filtering Pint's full-repo output) — surface it to the user directly when it causes friction, as was done 2026-09-10. It's the user's call whether to `git init` backend/ (project-manager should not do this unilaterally per root CLAUDE.md), but it should stop being treated as a one-off surprise each time an agent hits it.
