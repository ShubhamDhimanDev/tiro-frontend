import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

/**
 * POST /api/revalidate — the one *inbound* exception to this app's
 * `app/api/` convention (every other route there is an outbound proxy to
 * Laravel; this one receives a call *from* Laravel's queued
 * `NotifyFrontendRevalidation` job). Implements
 * docs/architecture/02-api-contract.md's "ISR on-demand revalidation
 * webhook" section (Phase 6) against the confirmed real contract:
 * header `X-Revalidate-Secret`, body `{ "tags": string[] }`.
 *
 * Auth: a shared-secret header, compared using a constant-time comparison
 * (`crypto.timingSafeEqual`) rather than `===` — mirrors backend's own
 * `hash_equals()` comparison (per the contract doc), proportionate to the
 * documented threat model ("this endpoint's only caller is Laravel itself,
 * over infrastructure devops-agent controls"). `REVALIDATE_WEBHOOK_SECRET`
 * must be byte-for-byte identical to backend's `FRONTEND_REVALIDATE_SECRET`
 * (different env var names on each side, same value — see
 * frontend/.env.local's own comment on this).
 */

const SECRET_HEADER = "X-Revalidate-Secret";

/**
 * `timingSafeEqual` throws if the two buffers differ in length rather than
 * returning `false`, so a length check has to come first — same two-step
 * shape PHP's own `hash_equals()` uses internally (the contract's
 * documented backend-side comparison), not a weaker substitute for it.
 */
function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_WEBHOOK_SECRET;
  const provided = request.headers.get(SECRET_HEADER);

  if (!secret || !provided || !timingSafeEqualStrings(provided, secret)) {
    return NextResponse.json({ message: "Invalid or missing X-Revalidate-Secret." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = body?.tags;

  if (!Array.isArray(tags) || tags.length === 0 || !tags.every((tag) => typeof tag === "string" && tag.length > 0)) {
    return NextResponse.json(
      { message: "The tags field is required and must be a non-empty array of strings." },
      { status: 422 },
    );
  }

  // `{ expire: 0 }`, not a `cacheLife` profile like `"max"` — this webhook's
  // entire purpose is immediate freshness ("an admin editing a page won't
  // see it reflected for up to the revalidate window"), and `updateTag`
  // (the other immediate-expiry option) is Server-Action-only, unavailable
  // from a Route Handler. Per node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md:
  // "Use it when the caller needs the data gone immediately and you cannot
  // use updateTag" — exactly this case.
  for (const tag of tags as string[]) {
    revalidateTag(tag, { expire: 0 });
  }

  return NextResponse.json({ revalidated: true, tags }, { status: 200 });
}
