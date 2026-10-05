import { NextResponse } from "next/server";
import { friendlyErrorBody, isUpstreamFailure } from "@/lib/http/friendly-error";

/**
 * Forwards a backend-client `{ status, body }` result as this Route
 * Handler's own response — every `app/api/**` proxy in this app used
 * `NextResponse.json(result.body, { status: result.status })` directly
 * until Phase 7's hard-delete endpoints (`DELETE /api/v1/customer/vehicles`/
 * `addresses`) introduced the first real `204` responses this app proxies.
 *
 * `204`/`205`/`304` are WHATWG Fetch "null body status" codes — the
 * `Response` constructor throws if given one of these statuses alongside a
 * non-null body (confirmed directly against this project's own Node
 * runtime, not assumed: `new Response(JSON.stringify(x), {status:204})`
 * throws `"Invalid response status code 204"`; `new Response(null,
 * {status:204})` does not). `NextResponse.json()` always constructs a JSON
 * body internally, so calling it with one of these statuses would crash the
 * Route Handler — this helper special-cases them to a bodyless response
 * instead, and behaves exactly like the old direct call for every other
 * status.
 */
export function proxyResponse(result: { status: number; body: unknown }): NextResponse {
  // Never forward an upstream failure's body (exception text, stack traces,
  // connection strings): replace with the friendly `{message, code}` shape.
  if (isUpstreamFailure(result.status)) {
    return NextResponse.json(friendlyErrorBody(result.status), { status: result.status === 0 ? 503 : result.status });
  }
  if (result.status === 204 || result.status === 205 || result.status === 304) {
    return new NextResponse(null, { status: result.status });
  }
  return NextResponse.json(result.body, { status: result.status });
}
