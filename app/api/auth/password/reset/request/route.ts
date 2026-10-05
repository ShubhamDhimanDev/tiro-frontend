import { NextResponse } from "next/server";
import { proxyResponse } from "@/lib/http/proxy-response";
import { authBackend } from "@/lib/auth/backend";

/**
 * POST /api/auth/password/reset/request — action-only proxy to Laravel
 * `POST /api/v1/auth/password/reset/request`. Always a generic 200
 * regardless of whether the email exists (docs/architecture/08-customer-auth-otp.md §4).
 */
export async function POST(request: Request) {
  const { email } = (await request.json()) as { email?: string };

  if (!email) {
    return NextResponse.json({ message: "Email is required." }, { status: 422 });
  }

  const result = await authBackend.passwordResetRequest(email);
  return proxyResponse(result);
}
