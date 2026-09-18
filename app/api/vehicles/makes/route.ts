import { NextResponse } from "next/server";
import { vehiclesBackend } from "@/lib/vehicles/backend";

/**
 * GET /api/vehicles/makes — proxies `GET /api/v1/vehicles/makes`
 * (docs/architecture/02-api-contract.md's "Vehicle identification & fitment
 * endpoints"). The browser calls this Route Handler rather than Laravel
 * directly — same posture as every other domain proxy in this app (avoids
 * needing CORS on the Laravel API for a public endpoint, keeps
 * `LARAVEL_API_URL` server-only).
 */
export async function GET() {
  const result = await vehiclesBackend.makes();
  return NextResponse.json(result.body, { status: result.status });
}
