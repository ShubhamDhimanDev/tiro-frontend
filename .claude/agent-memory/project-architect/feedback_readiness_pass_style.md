---
name: feedback-readiness-pass-style
description: How the user wants pre-phase implementation-readiness passes conducted (recurring request pattern, now 4 phases in)
metadata:
  type: feedback
---

The user runs the same kind of request before each new phase starts (auth, Phase 1, Phase 2, Phase 3 so far): a "fast landmine hunt," explicitly **not** a redesign — but they also explicitly say some phases (Phase 3 booking especially) need real new design work, not just tightening existing docs, and expect that design to actually get written, not just flagged as a gap.

**Why:** three sub-agents (`backend-agent`, `super-admin-agent`, `frontend-agent`) implement independently against these docs with no CI and no monorepo — if a route shape, migration field, or RBAC module is left ambiguous, each agent guesses differently and the drift isn't caught until integration. The whole point of this role is to make that guessing unnecessary before build starts.

**How to apply:**
- Fix real gaps **directly in the architecture docs** (`docs/architecture/*.md`, `docs/plan/01-task-breakdown.md`), not in a separate summary/report file. The final chat response is a concise pointer to what changed, not a restatement of it.
- When a phase's docs reference a concept only conceptually (e.g. "build the policy as data," "reuse the shared reservation mechanism") without ever giving it a concrete schema/algorithm, that's exactly the kind of gap to fill in with a full spec, not just flag as "should be defined later."
- Always check whether an "open decision" the user flags as unresolved actually blocks the phase's buildable scope, or whether (like several prior items) it already has a documented permissive-default/config-driven placeholder that lets engineering proceed. State this explicitly either way — don't leave it ambiguous.
- Cross-check things the user says should already exist (an RBAC module, a task-breakdown note) against actual current code/doc state rather than assuming the brief's framing is accurate — it has been wrong before in a good way (bookings RBAC turned out to already be fully seeded, no gap) and in a bad way (Idempotency middleware / hold mechanism turned out to be scoped-but-never-built despite Phase 0 sounding done).
- Always state explicitly whether the standing `composer test` gate (Pint + phpstan level 7 + Pest) is still green, so backend-agent knows the bar is "stays at 0," not "improve from some N."
- End the report with a direct, concise verdict: what was found/designed, status of any specifically-named deferred task, RBAC check result, and a plain yes/no on doc readiness. The user hands this straight to `project-manager` next, so ambiguity here just moves the guessing downstream.
