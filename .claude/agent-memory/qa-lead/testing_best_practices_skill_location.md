---
name: testing-best-practices-skill-location
description: Where the testing-best-practices skill content actually lives on this machine — not in the global ~/.claude/skills dir.
metadata:
  type: reference
---

The `testing-best-practices` skill referenced by `backend/CLAUDE.md`'s Pest section is not in `~/.claude/skills` (that dir only has `framer`/`framer-code-components` on this machine) and not exposed as a callable `Skill` tool in qa-lead's toolset. It's vendored by Laravel Boost at:

`backend/vendor/laravel/boost/.ai/laravel/skill/testing-best-practices/SKILL.blade.php`
`backend/vendor/laravel/boost/.ai/laravel/skill/testing-best-practices/rules/*.blade.php` (finding-features, naming, assertions, endpoint-tests, test-data, isolation, security, performance, review)

Read these directly with the Read tool when defining test strategy — they're Blade templates but the guidance text is plain and readable without rendering. `rules/review.blade.php` has the checklist to apply when judging whether backend-tester's or existing tests provide real value (observable behavior, no duplicate coverage, factory-based data, etc). `rules/endpoint-tests.blade.php` and `rules/security.blade.php` are most relevant for auth/permission-heavy work.
