import { NextResponse } from "next/server";
import { proxyResponse } from "@/lib/http/proxy-response";
import { priceGuaranteeBackend } from "@/lib/price-guarantee/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import type { PriceGuaranteeClaimCreateInput } from "@/lib/price-guarantee/types";

/**
 * POST/GET /api/price-guarantee-claims — proxies
 * `POST`/`GET /api/v1/price-guarantee-claims`.
 *
 * Unlike every other proxy route in this app, there is no guest fallback to
 * attempt here at all — both upstream endpoints are `auth:customer`-only
 * (see docs/architecture/05-promotions-pricing.md's "Price-guarantee claim
 * workflow" section for why: a duplicate-claim double-submit is an
 * admin-queue nuisance, not a money bug, so this domain skips the
 * `Idempotency-Key`/guest-token machinery entirely). If there's no session
 * cookie, this short-circuits to `401` without a round trip to Laravel —
 * same "fail fast on a credential we already know is missing" posture as
 * `app/api/orders/[id]/route.ts`'s `403` short-circuit.
 */
export async function POST(request: Request) {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ message: "You need to be signed in to submit a price-match claim." }, { status: 401 });
  }

  const body = (await request.json()) as PriceGuaranteeClaimCreateInput;
  const result = await priceGuaranteeBackend.create(token, body);
  return proxyResponse(result);
}

export async function GET(request: Request) {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ message: "You need to be signed in to view your price-match claims." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pageParam = searchParams.get("page");
  const page = pageParam ? Number(pageParam) : undefined;

  const result = await priceGuaranteeBackend.list(token, page);
  return proxyResponse(result);
}
