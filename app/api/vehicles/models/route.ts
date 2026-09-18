import { NextResponse } from "next/server";
import { vehiclesBackend } from "@/lib/vehicles/backend";

/**
 * GET /api/vehicles/models?make= — proxies `GET /api/v1/vehicles/models`.
 * `make` is required by the contract (missing is 422); an unrecognized
 * `make` is a normal 200 with `data: []`. This route doesn't pre-validate
 * `make`'s presence itself — it forwards whatever (or nothing) came in and
 * lets backend-agent's real validation stay the single source of truth for
 * that rule, same posture as the availability proxy not pre-checking `zone`.
 */
export async function GET(request: Request) {
  const make = new URL(request.url).searchParams.get("make");
  const result = await vehiclesBackend.models(make);
  return NextResponse.json(result.body, { status: result.status });
}
