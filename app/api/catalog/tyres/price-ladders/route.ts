import { NextResponse } from "next/server";
import { catalogBackend } from "@/lib/catalog/backend";
import { getServiceZone } from "@/lib/location/cookies";

/**
 * GET /api/catalog/tyres/price-ladders?ids=1,2 proxies Laravel's
 * `GET /api/v1/tyres/price-ladders` (Phase 7: per-tyre price for 1 to 5 tyres
 * from the pricing engine, promotions such as 4 for 3 included) and adds the
 * visitor's service zone from the cookie so zone-scoped promotions apply.
 * Never cached: prices and promotions change.
 *
 * 200 `{ data: { "<id>": PriceLadder } }`; anything else is a pass-through
 * status with `{ data: {} }` so the card can fall back to the list price.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = [...new Set(raw.split(",").map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 24);
  if (ids.length === 0) return NextResponse.json({ data: {} });

  const zone = await getServiceZone();
  const result = await catalogBackend.priceLadders(ids, zone?.zoneId ?? null);
  if (result.status !== 200) return NextResponse.json({ data: {} }, { status: result.status === 429 ? 429 : 502 });
  return NextResponse.json(result.body, { headers: { "Cache-Control": "no-store" } });
}
