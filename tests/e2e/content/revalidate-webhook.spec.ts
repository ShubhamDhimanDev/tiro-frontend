import { test, expect } from "@playwright/test";
import { readFrontendEnvLocal } from "../helpers/env";

/**
 * `POST /api/revalidate` (`app/api/revalidate/route.ts`) — the one inbound
 * exception to this app's outbound-proxy `app/api/` convention. Direct HTTP
 * tests against the route handler itself (no browser/`page` needed — this
 * is Laravel's caller, not something a user's browser ever hits), covering
 * every branch the route's own doc comment documents:
 *   - valid secret + valid `{ tags: [...] }` -> 200 `{ revalidated: true, tags }`
 *   - missing/wrong `X-Revalidate-Secret` -> 401 (not a 500/crash)
 *   - missing/empty `tags` -> 422
 *
 * The full backend-dispatches-a-real-webhook-call round trip
 * (`NotifyFrontendRevalidation` job -> this route -> `revalidateTag`) is
 * exercised separately — see this suite's own completion notes for what was
 * and wasn't practically verifiable in this environment.
 */

const SECRET = readFrontendEnvLocal("REVALIDATE_WEBHOOK_SECRET");

test.describe("POST /api/revalidate", () => {
  test("valid secret + valid tags -> 200 revalidated with the same tags echoed back", async ({ request }) => {
    const tags = [`content:blog_post:e2e-webhook-test-${Date.now()}`];
    const res = await request.post("/api/revalidate", {
      headers: { "X-Revalidate-Secret": SECRET, "Content-Type": "application/json" },
      data: { tags },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ revalidated: true, tags });
  });

  test("missing X-Revalidate-Secret header -> 401, not a crash", async ({ request }) => {
    const res = await request.post("/api/revalidate", {
      headers: { "Content-Type": "application/json" },
      data: { tags: ["content:blog_post:whatever"] },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.message).toMatch(/invalid or missing/i);
  });

  test("wrong X-Revalidate-Secret -> 401", async ({ request }) => {
    const res = await request.post("/api/revalidate", {
      headers: { "X-Revalidate-Secret": "definitely-not-the-real-secret", "Content-Type": "application/json" },
      data: { tags: ["content:blog_post:whatever"] },
    });
    expect(res.status()).toBe(401);
  });

  test("no headers at all (no secret, no content-type, no body) -> 401, not a 500", async ({ request }) => {
    const res = await request.post("/api/revalidate");
    expect(res.status()).toBe(401);
  });

  test("valid secret but missing tags field -> 422", async ({ request }) => {
    const res = await request.post("/api/revalidate", {
      headers: { "X-Revalidate-Secret": SECRET, "Content-Type": "application/json" },
      data: {},
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.message).toMatch(/tags field is required/i);
  });

  test("valid secret but empty tags array -> 422", async ({ request }) => {
    const res = await request.post("/api/revalidate", {
      headers: { "X-Revalidate-Secret": SECRET, "Content-Type": "application/json" },
      data: { tags: [] },
    });
    expect(res.status()).toBe(422);
  });

  test("valid secret but tags contains a non-string entry -> 422", async ({ request }) => {
    const res = await request.post("/api/revalidate", {
      headers: { "X-Revalidate-Secret": SECRET, "Content-Type": "application/json" },
      data: { tags: ["content:blog_post:ok", 123] },
    });
    expect(res.status()).toBe(422);
  });

  test("valid secret but unparseable JSON body -> 422, not a 500", async ({ request }) => {
    const res = await request.post("/api/revalidate", {
      headers: { "X-Revalidate-Secret": SECRET, "Content-Type": "application/json" },
      data: "not json {{{",
    });
    expect(res.status()).toBe(422);
  });
});
