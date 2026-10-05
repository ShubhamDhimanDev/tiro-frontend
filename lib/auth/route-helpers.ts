import { NextResponse } from "next/server";
import { setAuthSession } from "./cookies";
import { friendlyErrorBody, isUpstreamFailure } from "@/lib/http/friendly-error";
import type { BackendResponse, TokenEnvelope } from "./types";

function isTokenEnvelope(body: unknown): body is TokenEnvelope {
  return (
    typeof body === "object" &&
    body !== null &&
    "data" in body &&
    typeof (body as TokenEnvelope).data?.token === "string"
  );
}

/**
 * Shared tail end of every token-issuing Route Handler
 * (register/verify, login, otp/verify, password/reset/verify):
 *
 * - On a 200 with a token envelope: read `data.token`, set it as the
 *   httpOnly session cookie (never sent to the client), and return only
 *   `{ customer }` to the browser — the client gets `data.customer` for
 *   hydration in this same response, no second round trip, and never sees
 *   the token itself.
 * - On any other status: pass the body/status through unchanged (401/404/422/429
 *   all defined in docs/architecture/08-customer-auth-otp.md §12).
 */
export async function respondWithSession(result: BackendResponse): Promise<NextResponse> {
  if (result.status === 200 && isTokenEnvelope(result.body)) {
    const { token, customer } = result.body.data;
    await setAuthSession({ token, customer });
    return NextResponse.json({ customer }, { status: 200 });
  }

  if (isUpstreamFailure(result.status)) {
    return NextResponse.json(friendlyErrorBody(result.status), { status: result.status === 0 ? 503 : result.status });
  }

  return NextResponse.json(result.body, { status: result.status });
}
