# Security Agent Memory Index

- [Permission slug source of truth](permission_slug_source_of_truth.md) — always verify `permission="..."` / `permission:...` strings against the seeder, never by inspection alone.
- [Mass-assignment guard style in this repo](mass_assignment_attribute_style.md) — models use PHP 8.4 `#[Fillable([...])]` attribute, not `protected $fillable`.
- [Phase 1 catalogue/location review outcome](phase1_catalogue_location_review.md) — snapshot of what passed on 2026-09-11 and the good patterns established.
