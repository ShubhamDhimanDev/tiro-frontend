import { NextResponse } from "next/server";
import { authBackend } from "@/lib/auth/backend";
import { respondWithSession } from "@/lib/auth/route-helpers";

/**
 * POST /api/auth/login — token-issuing proxy to Laravel `POST /api/v1/auth/login`.
 * 401 `{ message }` on any failure (unknown email, wrong password, unverified
 * account) is deliberately generic per docs/architecture/08-customer-auth-otp.md
 * §3a/§7 — do not add any client-side logic here that infers which case
 * occurred.
 */
export async function POST(request: Request) {
  const { email, password } = (await request.json()) as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
  }

  const result = await authBackend.login(email, password);
  return respondWithSession(result);
}
