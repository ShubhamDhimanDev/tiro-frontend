import { NextResponse } from "next/server";
import { catalogBackend } from "@/lib/catalog/backend";

/**
 * GET /api/catalog/tyres/{slug}/availability?zone= — proxies
 * `GET /api/v1/tyres/{slug}/availability` (docs/architecture/02-api-contract.md).
 * Always a live client-side call, per the contract's server-rendered-vs-
 * client-fetched table — never statically cached, never baked into the
 * PDP's SSG render. The browser calls this Route Handler rather than
 * Laravel directly (same posture as every other domain in this app — avoids
 * needing CORS on the Laravel API for a public endpoint and keeps
 * `LARAVEL_API_URL` server-only).
 *
 * `zone` is required by Laravel's contract (422 if missing); an unknown
 * zone id is 404 — both pass through unchanged so the client component can
 * distinguish "no location set" (own client-side check, before even
 * calling this) from "location was set but got rejected as stale" (404
 * here — see `components/catalog/pdp-availability.tsx`).
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const zone = new URL(request.url).searchParams.get("zone");

  const result = await catalogBackend.availability(slug, zone);
  return NextResponse.json(result.body, { status: result.status });
}
