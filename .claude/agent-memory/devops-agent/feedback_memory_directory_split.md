---
name: feedback-memory-directory-split
description: devops-agent's memory has been written to two different directories depending on session cwd — check both, or trust this consolidated one
metadata:
  type: feedback
---

Found 2026-09-11: a prior devops-agent session (invoked with `c:\zzz-shubham\MTS` as cwd, not `c:\zzz-shubham\MTS\frontend`) wrote its memory to `c:\zzz-shubham\MTS\.claude\agent-memory\devops-agent\` instead of this directory (`c:\zzz-shubham\MTS\frontend\.claude\agent-memory\devops-agent\`, the one named in this session's own system prompt). That root-level copy had 6 files (including a fuller `project-docker-compose-status`, plus `user-delegation-style`, `feedback-shared-dev-machine`, `feedback-parallel-agent-live-sessions`, `project-mysql-workaround-origin`) that weren't reflected in this directory's `MEMORY.md` at all — this session only had 2 of those on record until it manually found and read the other directory.

**Why:** Memory is written relative to wherever the invoking session's `.claude/agent-memory/devops-agent/` resolves, which depends on that session's working directory, not on any project-wide fixed path. If a future session gets invoked with root `MTS` as cwd instead of `MTS/frontend`, the same split will recur.

**How to apply:** As of 2026-09-11 this directory (`frontend/.claude/agent-memory/devops-agent/`) has been manually brought up to date with everything that mattered from the root-level copy — treat this one as current/authoritative going forward. If something referenced from an old conversation isn't showing up here, check `c:\zzz-shubham\MTS\.claude\agent-memory\devops-agent\` before assuming it never existed. If a future session is ever invoked with root `MTS` as cwd again, proactively sync anything it writes back into this directory (or flag the split to the user) rather than letting the two drift apart silently again.
