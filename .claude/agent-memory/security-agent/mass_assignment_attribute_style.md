---
name: mass-assignment-attribute-style
description: This codebase's Eloquent models declare fillable fields via the PHP 8.4 #[Fillable([...])] class attribute, not the classic protected $fillable property — plain grep for "fillable" misses it.
metadata:
  type: project
---

Backend Eloquent models (e.g. `backend/app/Models/StockLocation.php`,
`InventoryItem.php`, `ServiceZone.php`, `Suburb.php`, `State.php`, `Brand.php`,
`TyreModel.php`, `TyreVariant.php`) declare their mass-assignable fields using
Laravel 13 / PHP 8.4's `#[Fillable(['field', ...])]` class-level attribute
(from `Illuminate\Database\Eloquent\Attributes\Fillable`), placed directly
above the `class` declaration — not the older `protected $fillable = [...]`
property.

**Why:** A grep for `protected \$fillable|guarded` across these models returns
zero hits and could be misread as "no mass-assignment guard exists," when
actually every model in Phase 1 was properly scoped (checked 2026-09-11 — no
`id`, timestamps, or unintended fields like cost/margin columns were
fillable).

**How to apply:** When auditing mass-assignment guards, grep for
`Fillable(\[` (capital F, attribute syntax) in addition to (or instead of)
`protected \$fillable`/`\$guarded`, or you'll get a false "ungated" read.
