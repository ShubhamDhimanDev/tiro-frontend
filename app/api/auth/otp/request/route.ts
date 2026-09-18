import { NextResponse } from "next/server";
import { authBackend } from "@/lib/auth/backend";

/**
 * POST /api/auth/otp/request — action-only proxy to Laravel
 * `POST /api/v1/auth/otp/request`. Always a generic 200; never reveals
 * whether the email is registered (docs/architecture/08-customer-auth-otp.md §3b, §6).
 */
export async function POST(request: Request) {
  const { email } = (await request.json()) as { email?: string };

  if (!email) {
    return NextResponse.json({ message: "Email is required." }, { status: 422 });
  }

  const result = await authBackend.otpRequest(email);
  return NextResponse.json(result.body, { status: result.status });
}
