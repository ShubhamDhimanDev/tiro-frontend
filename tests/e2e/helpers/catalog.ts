import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * Test-only DB fixture mutation via `php artisan tinker --execute=...`, same
 * shelling-out posture as `helpers/otp.ts`'s queue-drain — this is how this
 * suite compensates for gaps between what `CatalogueSeeder`/`LocationSeeder`
 * give us and what a real E2E pass needs, not a substitute for seeding
 * itself.
 *
 * Why this exists: `CatalogueSeeder` gives every `TyreVariant` an identical
 * `qty_on_hand` (random 5-30, never 0-3) at *every* `StockLocation`, and
 * every `StockLocation` backs at least one zone actually being tested here
 * — so with the seed data alone, every zone-scoped stock lookup comes back
 * `in_stock` and there is no way to exercise `limited`/`out_of_stock`/
 * `unavailable_in_zone` (see `ZoneStockCalculator`). This mutates a handful
 * of specific, otherwise-test-unused variants' `InventoryItem` rows so the
 * PDP/zone-scoped stock_status branches have something real to assert
 * against — see `tests/e2e/catalog/pdp.spec.ts`. Idempotent (safe to call
 * more than once, e.g. re-running this suite without re-seeding).
 *
 * Uses `execFileSync` (argv array, no shell) rather than `execSync` with a
 * quoted string specifically because this runs on Windows dev machines too:
 * `execSync` shells out through `cmd.exe`, whose quoting rules make embedding
 * PHP code (itself full of quotes/`$`) fragile. `execFileSync` invokes
 * `php.exe` directly via argv, sidestepping cmd.exe's re-parsing entirely.
 */

const BACKEND_DIR = path.resolve(__dirname, "../../../../backend");

function tinker(code: string): void {
  try {
    execFileSync("php", ["artisan", "tinker", `--execute=${code}`], {
      cwd: BACKEND_DIR,
      stdio: "pipe",
    });
  } catch (err) {
    throw new Error(
      `Failed to run \`php artisan tinker --execute=...\` in ${BACKEND_DIR} for catalog test-fixture setup. ` +
        `Is \`php\` on PATH and is this checkout's backend/ the one wired to the running Laravel instance?\n\n${String(err)}`
    );
  }
}

/** Sets `qty_on_hand` (zeroing `qty_reserved`) for `variantSlug` at every `StockLocation` backing `zoneId` — the only two figures `ZoneStockCalculator` sums. Use 0 for `out_of_stock`, 1-3 for `limited`, >3 for `in_stock`. */
export function setZoneInventoryQty(variantSlug: string, zoneId: number, qtyOnHand: number): void {
  tinker(
    `$v = App\\Models\\TyreVariant::where('slug','${variantSlug}')->firstOrFail(); ` +
      `$z = App\\Models\\ServiceZone::findOrFail(${zoneId}); ` +
      `$ids = $z->stockLocations()->pluck('stock_locations.id'); ` +
      `App\\Models\\InventoryItem::where('tyre_variant_id',$v->id)->whereIn('stock_location_id',$ids)->update(['qty_on_hand'=>${qtyOnHand},'qty_reserved'=>0]); ` +
      `echo 'ok';`
  );
}

/** Deletes `variantSlug`'s `InventoryItem` rows at every `StockLocation` backing `zoneId` — the variant is no longer "carried" there at all, i.e. `unavailable_in_zone` per `ZoneStockCalculator::statusFor`'s `isCarriedInZone` branch (distinct from `out_of_stock`, which is carried but at qty 0). */
export function removeZoneInventory(variantSlug: string, zoneId: number): void {
  tinker(
    `$v = App\\Models\\TyreVariant::where('slug','${variantSlug}')->firstOrFail(); ` +
      `$z = App\\Models\\ServiceZone::findOrFail(${zoneId}); ` +
      `$ids = $z->stockLocations()->pluck('stock_locations.id'); ` +
      `App\\Models\\InventoryItem::where('tyre_variant_id',$v->id)->whereIn('stock_location_id',$ids)->delete(); ` +
      `echo 'ok';`
  );
}
