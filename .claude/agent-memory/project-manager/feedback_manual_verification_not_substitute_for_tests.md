---
name: feedback-manual-verification-not-substitute-for-tests
description: Reading an agent's code directly confirms its report matches its diff, but does not confirm automated regression coverage exists — qa-lead's gate catches that distinction, don't let "I independently verified" substitute for it
metadata:
  type: feedback
---

Throughout Phase 3, project-manager's standing practice of independently reading an agent's actual code (not just trusting its self-report) before accepting work caught real discrepancies and was consistently the right discipline — see [[project_phase3_booking_capacity]] for many examples. But it has a specific limit worth naming: confirming "the code does what the agent said" is not the same claim as "this behavior has automated regression coverage."

**Why:** At Phase 3's qa-lead sign-off gate (2026-09-21), qa-lead found that the `bookings.moved`/`bookings.cancelled` `AuditLog` behavior — which this project's own tracking had described as "confirmed correct" — had in fact never been asserted by a single Pest test. The only verification that had ever happened was project-manager reading the controller code directly, plus one backend-tester E2E click-through (which was itself later deprioritized by a scope change). Both were genuine, valid checks in their own right — they proved the code was written correctly at that moment — but neither would catch a future regression. Nothing in the suite would fail if a later change silently broke that behavior.

**How to apply:** When recording a finding as "verified" in memory or in a status report, be precise about *what kind* of verification happened — "read the code, confirms the diff matches the report" is a different, weaker claim than "confirmed by an automated test that will catch regressions." Don't let the former get flattened into language that reads like the latter. For anything security-sensitive, on a shared/reused mechanism, or likely to be built on by a later phase, push for real test coverage specifically — that's exactly qa-lead's remit, not a substitute a project-manager-level code read can fill in for, however careful. If a gate like qa-lead exists in the workflow, trust it to catch this distinction even after doing your own reading — as it did here.
