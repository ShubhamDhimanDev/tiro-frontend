---
name: project-launch-content-design-pass
description: Post-Phase-8 follow-up round (2026-09-28) — real legal/FAQ content seeded + design-system refinement (type scale, radius, shadow) landed and independently verified. Records the systemic zinc-scaffold gap found across the storefront and one unresolved devops side effect.
metadata:
  type: project
---

After all 8 build phases signed off, the user reviewed the live storefront and gave two pieces of feedback: the "Torque & Tarmac" design read "very minimal," and the site felt "very blank" content-wise (no real legal pages, no FAQ content). Dispatched as two sequential rounds on 2026-09-28.

## What shipped (both independently verified by project-manager reading the actual diffs, not just trusting agent self-reports)

**backend-agent** — `backend/database/seeders/LaunchContentSeeder.php` (new, idempotent `updateOrCreate`-based), registered in `DatabaseSeeder.php`. Seeds 4 `ContentPage` rows (`terms-conditions`, `privacy-policy`, `about-us`, `contact`, all `type=page`/`status=published`) and 5 global `Faq` rows (`booking`/`service`/`pricing` categories) through the existing Phase 6 CMS — no new infrastructure. Verified byte-for-byte against the legally-drafted source copy (including every bracketed placeholder like `[SUPPORT_EMAIL]`/`[ABN PLACEHOLDER]` left intentionally unresolved). Confirmed live via `GET /api/v1/content/pages/page/{slug}` and `GET /api/v1/content/faqs` (200s, real content) and a full `composer test` pass (864 tests, 862 passed, 2 pre-existing skips).

**frontend-agent** — design-token refinement in `app/globals.css` (radius collapsed from six near-duplicate 2-4px tokens to a functionally genuine 3-step system: 0 implicit/unstyled for docket surfaces, all six `--radius-*` keys aliased to 3px for buttons/inputs — kept as aliases rather than removed, specifically to avoid regressing untouched out-of-scope files back to Tailwind's un-overridden 8-16px defaults; native `rounded-full` reserved for genuine status chips only), a new type-scale role table (`.type-subheading`, `.type-eyebrow` with real `letter-spacing`), confirmed the hard-offset "stamped" shadow exists in exactly the two intended spots (hero search widget, location prompt) and nowhere else. New `components/home/guarantee-strip.tsx` (3 real claims: price match, no callout fee, fitted & balanced — all traced to actual features/copy, none invented) and `components/content/faq-preview.tsx` (real `/api/v1/content/faqs` data, expand/collapse, links to `/faq`) added to the homepage. `components/content/content-page-body.tsx` and `app/faq/page.tsx` restyled off the old Next.js scaffold zinc palette onto Torque & Tarmac. Footer gained a "Company" column linking to the 4 real new slugs. Checkout's "Place order" button got a real Terms/Privacy link plus a local color-token fix to its immediate surroundings. `npm run lint`/`build`/`test` all clean (250/250 tests).

## Non-obvious finding: the "already implemented" design pass did not cover the whole app

Confirmed by direct grep, not assumption: large surfaces are still on the **original Next.js scaffold zinc/dark-mode palette**, never touched by the Torque & Tarmac restyle at all — `app/(auth)/layout.tsx` (login/register/reset wrapper, also has a stray soft `shadow-sm` that violates the near-zero-ambient-shadow rule), `app/price-guarantee-claims/new/page.tsx`, and the body text (non-chip parts) of `components/account/saved-vehicles-list.tsx`, `saved-addresses-list.tsx`, `order-history-list.tsx`. Also `components/checkout/checkout-flow.tsx`'s "Your appointment" summary box (just above the button region that WAS fixed this round) is still zinc-styled. These were deliberately left alone this round (out of the given scope) and frontend-agent confirmed it saw and skipped them rather than missing them.

**How to apply:** don't assume a prior "design pass complete" status means full-site coverage — verify per-surface. This is a real, scoped backlog item: a dedicated "finish the Torque & Tarmac migration" pass should cover these five files plus any others a fresh grep for `zinc-` / `dark:` turns up, before assuming visual consistency is done. Route to frontend-agent when picked up; no backend/data-model implications.

## Unresolved operational side effect — needs devops-agent or user attention

While verifying, backend-agent found Docker Desktop/`tiro-mysql` down and started them itself, and had to raise the local machine's PHP CLI `memory_limit` (`C:\php\php.ini`) from 128M to 1024M to get `phpstan`/the full Pest suite to run without OOMing (pre-existing environment issue, unrelated to this task's own change). Its attempts to revert that ini edit back to 128M failed repeatedly due to an unrelated tool-infrastructure outage (a server-side safety-classifier outage affecting Edit/Bash that session) — **`C:\php\php.ini` currently still has `memory_limit = 1024M`, machine-wide, not reverted.** Low risk (raising the limit is unlikely to break anything) but is a deviation from prior state that nobody has confirmed as intentional. Flag to devops-agent to either revert or explicitly bless 1024M as the new baseline.

## How to apply

This file is a closed-round reference — read it when picking up the zinc-scaffold backlog or the php.ini item above. Not an active tracker.
