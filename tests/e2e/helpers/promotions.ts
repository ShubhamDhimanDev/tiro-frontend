import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * Test-only DB fixture creation via `php artisan tinker --execute=...`, same
 * shelling-out posture as `helpers/catalog.ts`/`helpers/otp.ts` — see
 * `helpers/catalog.ts`'s doc comment for why `execFileSync` (argv array, no
 * shell) is used rather than `execSync` with a quoted string (this runs on
 * Windows dev machines too, where `execSync`'s `cmd.exe` re-parsing makes
 * embedding PHP code fragile).
 *
 * Unlike `helpers/catalog.ts` (which mutates existing seeded rows,
 * idempotently), this creates brand-new `Promotion`/`PromotionEligibility`
 * rows — not idempotent by design, since each spec run against a fresh
 * `scripts/test-db.sh`-created isolated schema starts with zero promotions.
 * Do not call this against the shared dev database.
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
      `Failed to run \`php artisan tinker --execute=...\` in ${BACKEND_DIR} for promotion test-fixture setup. ` +
        `Is \`php\` on PATH and is this checkout's backend/ the one wired to the running Laravel instance ` +
        `(pointed at an isolated schema via \`scripts/test-db.sh\`, per root CLAUDE.md)?\n\n${String(err)}`
    );
  }
}

/**
 * Creates a real, currently-active, unscoped-by-zone `Promotion` (percentage
 * type) plus a `PromotionEligibility` row scoping it to `variantSlug` —
 * exactly what `App\Services\Promotions\PromotionEvaluationService` needs to
 * pick it up on the next `POST /api/v1/cart/calculate` call for that
 * variant, in any zone. Mirrors `PromotionFactory`/`PromotionEligibilityFactory`'s
 * own default shape (no usage/stock limit, non-stackable) rather than
 * reinventing a different fixture shape client-side.
 */
export function createPercentagePromotion(opts: { variantSlug: string; name: string; percentValue: number }): void {
  const { variantSlug, name, percentValue } = opts;
  const escapedName = name.replace(/'/g, "\\'");
  tinker(
    `$v = App\\Models\\TyreVariant::where('slug','${variantSlug}')->firstOrFail(); ` +
      `$p = App\\Models\\Promotion::create([` +
      `'name'=>'${escapedName}',` +
      `'type'=>App\\Enums\\PromotionType::Percentage,` +
      `'value'=>${percentValue},` +
      `'starts_at'=>now()->subDay()->toDateString(),` +
      `'ends_at'=>now()->addMonth()->toDateString(),` +
      `'usage_limit'=>null,'usage_count'=>0,'stock_limit'=>null,'stackable'=>false,` +
      `'status'=>App\\Enums\\Status::Active,` +
      `]); ` +
      `App\\Models\\PromotionEligibility::create([` +
      `'promotion_id'=>$p->id,` +
      `'scope'=>App\\Enums\\PromotionEligibilityScope::TyreVariant,` +
      `'scope_id'=>(string) $v->id,` +
      `'service_zone_id'=>null,` +
      `]); ` +
      `echo 'ok';`
  );
}

/**
 * Creates one `PriceGuaranteeClaim` per status (`pending`/`approved`/
 * `rejected`) for the customer identified by `customerEmail`, all against
 * `tyreVariantSlug`, using `PriceGuaranteeClaimFactory`'s own `approved()`/
 * `rejected()` states rather than hand-rolling the same field combinations
 * client-side. The approved claim additionally gets `redeemed_at` set when
 * `redeemApproved` is true — used to cover the claims-list's 3-way
 * "already applied" / "apply it before {date}" / neither branch across
 * separate calls with different variant slugs (so each claim's own approved
 * row is independently redeemed or not, rather than trying to seed all
 * three trailing-text variants under one customer at once).
 */
export function seedPriceGuaranteeClaims(
  customerEmail: string,
  tyreVariantSlug: string,
  opts: { redeemApproved?: boolean } = {}
): void {
  const redeemLine = opts.redeemApproved ? `$approved->update(['redeemed_at'=>now()]); ` : "";
  tinker(
    `$c = App\\Models\\Customer::where('email','${customerEmail}')->firstOrFail(); ` +
      `$v = App\\Models\\TyreVariant::where('slug','${tyreVariantSlug}')->firstOrFail(); ` +
      `App\\Models\\PriceGuaranteeClaim::factory()->for($c)->create(['tyre_variant_id'=>$v->id]); ` +
      `$approved = App\\Models\\PriceGuaranteeClaim::factory()->for($c)->approved(2000)->create(['tyre_variant_id'=>$v->id]); ` +
      redeemLine +
      `App\\Models\\PriceGuaranteeClaim::factory()->for($c)->rejected()->create(['tyre_variant_id'=>$v->id]); ` +
      `echo 'ok';`
  );
}
