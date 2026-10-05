import { NextResponse } from "next/server";
import { liveNewsletterBackend } from "@/lib/newsletter/backend-client";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCES = new Set(["footer", "home", "checkout", "offers", "blog"]);

/**
 * POST /api/newsletter proxies `POST /api/v1/newsletter-subscriptions`.
 * Only known string fields are read. A filled honeypot (`website`) skips local
 * validation and is forwarded as-is (the API answers like a success and stores
 * nothing). 429 keeps its Retry-After. The email is never logged or echoed.
 */
export async function POST(request: Request) {
  const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ message: "Enter a valid email address.", errors: { email: ["Enter a valid email address."] } }, { status: 422 });
  }
  const str = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string).trim() : "");
  const email = str("email");
  const website = str("website");

  if (!website && (!EMAIL.test(email) || email.length > 254)) {
    const message = "That email address does not look right. Check it and try again.";
    return NextResponse.json({ message, errors: { email: [message] } }, { status: 422 });
  }

  const source = SOURCES.has(str("source")) ? str("source") : "home";
  const firstName = str("first_name").slice(0, 80);
  const forwarded = request.headers.get("x-forwarded-for");
  const clientIp = forwarded ? forwarded.split(",")[0].trim() : null;

  const result = await liveNewsletterBackend.subscribe(
    { email, ...(firstName ? { first_name: firstName } : {}), source, website },
    { clientIp },
  );
  const response = NextResponse.json(result.body, { status: result.status });
  if (result.status === 429 && result.retryAfter) response.headers.set("Retry-After", result.retryAfter);
  return response;
}
