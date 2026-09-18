import { NextResponse } from "next/server";
import { authBackend } from "@/lib/auth/backend";
import { respondWithSession } from "@/lib/auth/route-helpers";

/**
 * POST /api/auth/password/reset/verify — token-issuing proxy to Laravel
 * `POST /api/v1/auth/password/reset/verify`. Code and new password are
 * submitted together (no separate "stage the password" step, unlike
 * registration) per docs/architecture/08-customer-auth-otp.md §4.
 */
export async function POST(request: Request) {
  const { email, code, new_password } = (await request.json()) as {
    email?: string;
    code?: string;
    new_password?: string;
  };

  if (!email || !code || !new_password) {
    return NextResponse.json(
      { message: "Email, code, and new password are required.", errors: { code: ["Code is required."] } },
      { status: 422 }
    );
  }

  const result = await authBackend.passwordResetVerify(email, code, new_password);
  return respondWithSession(result);
}
