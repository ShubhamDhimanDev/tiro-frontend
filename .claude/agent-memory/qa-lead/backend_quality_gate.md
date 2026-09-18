---
name: backend-quality-gate
description: What `composer test` actually runs in backend/, and a local PHPStan memory-limit gotcha — check before trusting a "tests pass" report that only ran the pest step.
metadata:
  type: reference
---

`backend/composer.json`'s `test` script is a chain, not just Pest:
1. `php artisan config:clear --ansi`
2. `@lint:check` → `pint --parallel --test`
3. `@types:check` → `phpstan analyse` (phpstan.neon: level 7, larastan, paths app/ bootstrap/app.php config/ database/ routes/)
4. `bash scripts/test-db.sh run -- php artisan test` — isolated ephemeral MySQL schema per run (see [[no_git_history]] for why that script exists)

Composer chains stop at the first failing step — if phpstan fails, the pest step in that same `composer test` invocation never runs at all. A report of "N passed" from `php artisan test --compact` or `vendor/bin/pest` run directly does NOT mean `composer test` (the project's actual defined gate) is green. Always run the full `composer test` (or at minimum lint:check + types:check separately) before signing off, not just the raw test runner.

**PHPStan memory gotcha on this dev machine**: `composer test`'s bare `phpstan analyse` crashes with "reached configured PHP memory limit: 128M" under parallel workers using this machine's default php.ini. Re-run directly with an explicit override to get a real signal instead of a false "environment crash" reading:
```
php -d memory_limit=-1 vendor/bin/phpstan analyse --memory-limit=2G -v
```
The `-v` flag matters too — the default output silently truncates the error list (a Boost-style JSON formatter with `"truncated": true` and only ~20 files shown) even when `--error-format=table` is passed; `-v` returns the full untruncated `error_details` JSON covering every error.

As of 2026-09-11 this repo's phpstan step was failing with 81 errors across 37 files when actually run — see [[phase1_signoff_2026-09-11]] for the triage of which mattered.
