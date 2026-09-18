import { NextResponse } from "next/server";
import { vehiclesBackend } from "@/lib/vehicles/backend";

/**
 * GET /api/vehicles/years?make=&model= — proxies `GET /api/v1/vehicles/years`.
 * Both `make` and `model` are required by the contract (missing either is
 * 422) — validated by the backend, not pre-checked here, same posture as
 * the sibling `models` route.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const make = url.searchParams.get("make");
  const model = url.searchParams.get("model");
  const result = await vehiclesBackend.years(make, model);
  return NextResponse.json(result.body, { status: result.status });
}
