---
name: feedback-validate-failure-root-cause
description: seeing an identical failure count across repeated runs is evidence the failure is deterministic, not evidence it's pre-existing/unrelated to a change just made
metadata:
  type: feedback
---

Don't characterize a test failure (or failure count) as "pre-existing" or "unrelated to my change" just because re-running produces the same numbers. Identical counts across runs only prove the failure is deterministic — they say nothing about *why* it's failing or whether something in the current session's own changes caused it.

**Why:** On 2026-09-11, while building `backend/scripts/test-db.sh` (see [[project-test-db-isolation]]), a newly-created `backend/.env.testing` was missing `APP_KEY` entirely, breaking Laravel's encrypter for any test touching `encrypt()`/`decrypt()` — a large fraction of the suite via `tests/Pest.php`'s shared `actingSuperAdmin()` helper. The failure count (`112 passed, 18 failed` out of 226) was reported as "confirmed pre-existing" on the strength of getting the same number wrapped and unwrapped by the new isolation script — but the real cause was a bug introduced in that exact same session (the missing `APP_KEY`), not something pre-existing. The reported numbers also didn't even arithmetically reconcile (112+18 ≠ 226), which should have been a signal to dig further before writing "confirmed" into memory. It took the user and a peer agent (super-admin-agent) independently re-deriving the actual root cause to catch this.

**How to apply:** Before labeling any failure as pre-existing/unrelated/out-of-scope, actually read the failure's error message/stack trace and identify the root cause — don't infer causation from run-to-run determinism alone. Sanity-check that reported pass/fail/skip counts arithmetically sum to the reported total before including them in a report; a mismatch means the numbers weren't actually re-verified, just copied forward. This applies especially when the failing tests exercise something touched by files created/edited in the same session (here: a brand-new `.env.testing`).
