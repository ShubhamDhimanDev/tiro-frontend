/**
 * Catalogue stub/live switches. Everything is config-driven so the storefront
 * can be pointed at the live Laravel API or at local mocks without code edits.
 *
 * - `CATALOG_BACKEND=stub` (server env, see `lib/catalog/backend.ts`): use the
 *   in-memory stub instead of Laravel. Live is the default.
 * - `NEXT_PUBLIC_CATALOG_MOCKS=on` (build/runtime env, readable in the browser):
 *   fill in made-up merchandising (placeholder prices, "4 for 3" every 4th tyre,
 *   marketing feature chips, a hard-coded car make list) where the API gives
 *   nothing. Default off: the UI shows only what the API returned.
 *
 * `CLIENT_SIDE_FILTERS`: the extra sidebar filters (min load, min speed,
 * runflat, pattern, price range) are applied by the API. Only the stub, which
 * ignores those params, needs them applied to the current page client-side.
 */
export const CATALOG_MOCKS = process.env.NEXT_PUBLIC_CATALOG_MOCKS === "on";

export const CLIENT_SIDE_FILTERS = process.env.CATALOG_BACKEND === "stub";
