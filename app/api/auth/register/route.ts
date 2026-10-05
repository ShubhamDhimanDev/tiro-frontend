import { NextResponse } from "next/server";
import { proxyResponse } from "@/lib/http/proxy-response";
import { authBackend } from "@/lib/auth/backend";

/**
 * POST /api/auth/register — action-only proxy to Laravel `POST /api/v1/auth/register`.
 * Success: 200 `{ message }`. Failure: 422 (email already activated / password
 * complexity) or 429 (resend cooldown), both passed through unchanged.
 * See docs/architecture/08-customer-auth-otp.md §2, §12.
 */
export async function POST(request: Request) {
  const { email, password } = (await request.json()) as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 422 });
  }

  const result = await authBackend.register(email, password);
  return proxyResponse(result);
}
