---
name: project-r2-integration-decisions
description: 2026-10-02 Phase R2 (chat, brand logos, map, social proof, badges) decisions in docs/architecture/10-r2-integration-decisions.md, plus non-obvious findings that came out of reading the code
metadata:
  type: project
---

Decision doc: `C:\zzz-shubham\MTS\docs\architecture\10-r2-integration-decisions.md` (written 2026-10-02). Open-decision rows 25-29 and 02-api-contract/01-data-model edits were listed there as follow-ups but NOT made (brief was read-only except that file) — check whether they got done before assuming.

Non-obvious facts worth not re-deriving:
- `brands.logo_path` already exists end to end (migration, model, resource, admin free-text input); the real gaps are upload, an absolute `logo_url`, and ISR tags. Home brands band (`lib/home/load.ts`) and `/brands` index fetch `GET /brands` UNTAGGED (3600s timer) and `Brand::revalidationTags` emits nothing on create, so admin edits are not instant there. Decision: new tag `content:brand:list`.
- No CSP exists on the storefront. Nonce CSP is vetoed (forces dynamic rendering, kills SSG/ISR per Next's own CSP guide); use allow-list in `next.config.ts headers()` with 'unsafe-inline' scripts, Report-Only first; Nginx must not also send a storefront CSP.
- `components/checkout/address-autocomplete.tsx` uses legacy `google.maps.places.Autocomplete`, unavailable to NEW Google Cloud customers since 2025-03-01; and key presence disables its manual fallback. Landmine when the client creates a fresh Google project.
- ServiceZone has no polygons (radius + suburb_list only; resolver is centroid-haversine); `/locations` APIs expose no coordinates; ServiceZone/Suburb/State do not implement RevalidatesFrontend (timer-only).
- Social-proof endpoint (backend-agent, 2026-10-02) had blocking gaps: opt-out flag unreachable (no write path), eligibility only `payment_status=Paid` (misses status refund_required/cancelled), exact timestamps, global-not-per-suburb threshold counting rows not customers, fragile first-name parse, no enable flag, and code cites a non-existent 02-api-contract section. Policy: ships dark; launch default is anonymous aggregate.

**Why:** these were found by reading code against the plan, same code-vs-doc drift habit as earlier passes ([[project-tiro-rebuild-orientation]]).
**How to apply:** when R2 items are implemented, re-verify these specifics against the repo before trusting this note.
