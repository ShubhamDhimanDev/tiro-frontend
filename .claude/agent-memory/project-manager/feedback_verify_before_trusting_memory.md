---
name: feedback-verify-before-trusting-memory
description: A prior session's belief about what was "in flight" or "done" can be stale or wrong — always re-verify against the actual filesystem/DB before delegating on top of it
metadata:
  type: feedback
---

When resuming cross-cutting work after a session was cut off (session limit, crash, etc.) with no final report, do not trust that session's memory or the launching message's summary of it as ground truth — treat it only as a starting hint.

**Why:** On 2026-09-10, a prior orchestration session working on customer-auth (backend/super-admin/frontend/security) was cut off mid-work by a session limit and never reported final status. The user did a direct filesystem audit before resuming and found the actual state differed from what memory implied in several places: some work believed "in flight" had actually finished cleanly (e.g. the `roles-users.manage` permission slug ambiguity super-admin-agent had guessed around was already correctly resolved in the seeder), while other work assumed complete had never landed (DB engine correction to MySQL was sent in the dead session but never applied — `.env` was still sqlite) or didn't exist at all (routes/api.php never existed despite architecture docs describing a full endpoint surface).

**How to apply:** Before delegating further work that builds on a "confirmed" prior state, spend the first turns re-reading the actual files/migrations/config/routes directly rather than acting on memory or a hint's claims. Only delegate once you've verified the specific claims that matter for the next step (e.g. "does this migration file actually exist and match the doc," "does routes/api.php actually exist"). This is generically true beyond this one incident — apply it any time a task description says a previous session was interrupted or its status is uncertain.
