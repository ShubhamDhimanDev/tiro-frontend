import { NextResponse } from "next/server";
import { authBackend } from "@/lib/auth/backend";
import { respondWithSession } from "@/lib/auth/route-helpers";

/**
 * POST /api/auth/register/verify — token-issuing proxy to
 * Laravel `POST /api/v1/auth/register/verify`. This is the moment the
 * account activates (docs/architecture/08-customer-auth-otp.md §2) — on
 * success we set the httpOnly session cookie and return `{ customer }`.
 */
export async function POST(request: Request) {
  const { email, code } = (await request.json()) as { email?: string; code?: string };

  if (!email || !code) {
    return NextResponse.json(
      { message: "Email and code are required.", errors: { code: ["Code is required."] } },
      { status: 422 }
    );
  }

  const result = await authBackend.registerVerify(email, code);
  return respondWithSession(result);
}
