import { NextResponse } from "next/server";
import { authBackend } from "@/lib/auth/backend";
import { respondWithSession } from "@/lib/auth/route-helpers";

/**
 * POST /api/auth/otp/verify — token-issuing proxy to Laravel
 * `POST /api/v1/auth/otp/verify`. Unlike password login, a 404 here is
 * deliberately actionable ("no account found — register to continue") per
 * docs/architecture/08-customer-auth-otp.md §3b/§12 — the caller has already
 * proven inbox ownership by entering a correct code.
 */
export async function POST(request: Request) {
  const { email, code } = (await request.json()) as { email?: string; code?: string };

  if (!email || !code) {
    return NextResponse.json(
      { message: "Email and code are required.", errors: { code: ["Code is required."] } },
      { status: 422 }
    );
  }

  const result = await authBackend.otpVerify(email, code);
  return respondWithSession(result);
}
