---
name: permission-slug-source-of-truth
description: Where to verify every permission slug used in routes/controllers/frontend against what is actually seeded, to catch drift like the roles.manage vs roles-users.manage bug.
metadata:
  type: project
---

`backend/database/seeders/RolesAndPermissionsSeeder.php` is the single source of
truth for every permission slug that actually exists in the system. It defines
`MODULES` (currently: products, inventory, orders, bookings, customers,
locations, promotions, content, reporting, roles-users) and generates
`{module}.view` / `{module}.manage` for each, plus the standalone
`bookings.view-own` for the technician role. `ROLE_MODULE_TIERS` then maps
which role gets which tier per module.

**Why:** During Phase 0, `backend/resources/js/pages/users/index.tsx` gated its
UI on `permission="roles.manage"` — a plausible-looking slug that was never
seeded (the real one is `roles-users.manage`). It shipped past Phase 0's own
security review because the review's test hit the POST route directly rather
than exercising real page navigation, so the UI-vs-seed mismatch never
surfaced. It was caught and fixed during Phase 1's build.

**How to apply:** On every security pass touching the admin panel, grep every
`permission="..."` / `<Can permission="...">` string literal in
`backend/resources/js/pages/**` and every `permission:...` string in
`backend/routes/*.php` and `->can('...')` / FormRequest `authorize()` calls,
and diff the resulting slug set against what `MODULES` × `ROLE_MODULE_TIERS`
in the seeder can actually produce. A slug that "looks right" is not evidence
it was seeded — only the seeder file is. As of the Phase 1 review
(2026-09-11) every slug in use (`products.manage`, `inventory.manage`,
`locations.manage`, `roles-users.manage`, `products.view`, `inventory.view`,
`locations.view`) matches a real seeded permission, and every mutating admin
route in `backend/routes/admin.php` for Products/Inventory/Locations sits
inside the correct `permission:{module}.manage` middleware group.

See also [[mass_assignment_attribute_style]] for another repo-specific gotcha
that changes how you grep this codebase.
