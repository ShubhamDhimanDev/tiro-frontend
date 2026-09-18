---
name: reference-signoff-convention
description: How sign-off gates work in docs/plan/01-task-breakdown.md — qa-lead is a standing per-phase gate, security-agent is called out per-row only where it applies
metadata:
  type: reference
---

`docs/plan/01-task-breakdown.md` (root-level docs, see [[repo_layout]]) states this convention explicitly at the top of the file: `qa-lead` sign-off is a standing gate at the end of every phase (manual, no CI) and is NOT repeated per row in the task table. The table's **Sign-off** column only flags additional `security-agent` review, required wherever a task touches auth, payments, or PII per security-agent's stated remit.

So when reading that table: a blank Sign-off cell does not mean "no review needed" — it means "qa-lead's standard end-of-phase gate applies, no extra security review beyond that." Only rows with `security-agent` explicitly listed need that agent's eyes before being considered done.

Phase 0's customer-auth rows (registration, password login, OTP login, password reset, guest-continuity) are almost all flagged for security-agent sign-off individually — this is a genuinely security-dense phase, not table noise.
