import { NextResponse } from "next/server";
import { socialProofBackend } from "@/lib/social-proof/backend";

/**
 * GET /api/social-proof proxies `GET /api/v1/social-proof/recent-orders`.
 * The browser calls this Route Handler, never Laravel directly (keeps
 * `LARAVEL_API_URL` server-only, same posture as every other proxy here).
 * Successful responses may be shared-cached for 60 s, matching the backend.
 */
export async function GET() {
  const result = await socialProofBackend.recentOrders();
  if (result.status !== 200) {
    // Never forward an upstream error body (it can carry stack traces); the UI treats any non-200 as "no rows".
    return NextResponse.json({ data: [] }, { status: result.status, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(result.body, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" } });
}
