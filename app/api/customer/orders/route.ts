import { NextResponse } from "next/server";
import { customerOrdersBackend } from "@/lib/customer-orders/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { proxyResponse } from "@/lib/http/proxy-response";

/**
 * GET /api/customer/orders — proxies `GET /api/v1/customer/orders`.
 * `auth:customer`-only, same `401`-short-circuit posture as every other
 * Phase 7 route. `?page=` passed straight through — standard paginated
 * envelope.
 */
export async function GET(request: Request) {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ message: "You need to be signed in to view your order history." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pageParam = searchParams.get("page");
  const page = pageParam ? Number(pageParam) : undefined;

  const result = await customerOrdersBackend.list(token, page);
  return proxyResponse(result);
}
