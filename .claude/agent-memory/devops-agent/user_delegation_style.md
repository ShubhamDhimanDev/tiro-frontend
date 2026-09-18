---
name: user-delegation-style
description: How this user delegates infra judgment calls to devops-agent and what they expect back
metadata:
  type: user
---

When the user hands devops-agent a genuinely open infra decision, they tend to lay out 2+ concrete options with their own reasoning for each, then explicitly delegate the final call ("your call, tell me which and why" / "use your judgment"). This is a real delegation, not a rhetorical one — they're comfortable with either path and want the agent to actually decide, not hedge or ask which they prefer.

What they expect back:
- A clear statement of which option was chosen, not just "done."
- The *why*, referencing the specific risk tradeoffs they raised (they think in terms of risk to other in-flight work, not just "what's fastest").
- Precise, actionable output values (exact host/port/key strings, not "check the .env file") when the task produces something another agent needs to consume — they explicitly said they'd relay this onward themselves, so it needs to be copy-pasteable.
- When investigating a bug/incident, primary evidence (container logs, timestamps, `docker inspect`) over secondhand agent-relayed theories — seen 2026-09-11 when a peer agent relayed a "corrected" root cause for a DB-collision incident that conflicted with what direct log/timestamp inspection showed; the user's framing throughout values verified fact over convenient narrative.

**Why:** Seen in the 2026-09-10 Meilisearch/Docker Compose task — user offered (a) one-off container vs (b) build the real compose stack, asked for the decision + reasoning + exact values to hand to backend-agent, and explicitly said no live coordination with the other agent was needed (see [[feedback-parallel-agent-live-sessions]] for how that instruction was interpreted). Reinforced 2026-09-11 during a DB-collision investigation requiring reconciling conflicting incident accounts.

**How to apply:** When given a similar open-ended "your call" framing, don't loop back to ask which option they prefer — decide, act, and report the decision + reasoning + concrete outputs in the final response. When investigating an incident, verify claims (including from other agents) against actual system state before reporting them as fact.
