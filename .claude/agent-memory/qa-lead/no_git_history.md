---
name: no-git-history
description: Neither backend/ nor frontend/ has any git commits despite substantial completed work — can't use git log/diff/blame to isolate what changed in a given phase.
metadata:
  type: project
---

As of 2026-09-11, `backend/` is on branch `master` with "No commits yet" (fully untracked working tree) and `frontend/` has exactly one commit ("Initial commit from Create Next App"). This is true even after a full, eventful Phase 1 (catalogue/location/serviceability) that included multi-round bug fixes, an incident response (DB collision), and reconciliation between backend-agent and frontend-agent's parallel work.

**Why this matters for QA**: normal git-based sign-off tricks don't work here — can't `git diff` to see what a phase actually touched, can't `git blame` to check whether a flagged issue is a regression or pre-existing tech debt. Had to establish this by reading code directly and reasoning about scope (e.g., is an error in a Phase-0 file like AuthController, or a Phase-1 file like TyreController) rather than by diffing.

**How to apply**: don't assume `git log`/`git diff` will give you phase-boundary information in this project — verify by reading source and cross-referencing against what the requesting agent's summary says was newly built vs pre-existing. If this is ever raised with the user, note it neutrally as an observation (no CI/CD + no commits means QA sign-off is the only record of "this was checked at this point in time" — worth capturing sign-off decisions in memory precisely because there's no commit history to anchor them to).
