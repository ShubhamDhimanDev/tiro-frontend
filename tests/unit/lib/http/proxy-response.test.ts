import { describe, expect, it } from "vitest";
import { proxyResponse } from "@/lib/http/proxy-response";

/**
 * `proxyResponse()`'s whole job, per its own docblock, is forwarding a
 * backend-client `{ status, body }` result as a Route Handler's own
 * response, special-casing the WHATWG Fetch "null body status" codes
 * (`204`/`205`/`304`) to a bodyless `Response` instead of the
 * `NextResponse.json()` call every other status uses — because the `Response`
 * constructor genuinely throws when given one of those statuses alongside a
 * non-null body.
 *
 * No per-file "run this under plain Node, not jsdom" environment override
 * pragma needed here despite this project's default `jsdom` test environment
 * (`vitest.config.ts`) — confirmed empirically, not assumed: jsdom itself
 * has never implemented `fetch`/`Response` (it deliberately leaves network
 * primitives to the host), so `Response`/`NextResponse` resolve to Node's
 * own native implementation regardless of which DOM environment Vitest sets
 * up around them. Such a pragma was tried here and rejected — beyond being
 * unnecessary, Vitest's pragma detection is a plain regex scan of the
 * *entire* file (not just a genuine top-of-file directive line), so it would
 * conflict with this project's global `tests/unit/setup.ts` (referenced via
 * `vitest.config.ts`'s `setupFiles`, which runs unconditionally regardless
 * of a per-file environment override), which reaches for `window` and throws
 * `ReferenceError: window is not defined` when no jsdom `window` exists —
 * confirmed by direct trial, not assumed either.
 */
describe("proxyResponse", () => {
  it("documents the underlying Node/Fetch behavior this helper exists to work around: the Response constructor throws on 204 + a non-null body, but not on 204 + a null body", () => {
    expect(() => new Response(JSON.stringify({ foo: "bar" }), { status: 204 })).toThrow(/invalid response status code|204/i);
    expect(() => new Response(null, { status: 204 })).not.toThrow();
  });

  it.each([204, 205, 304])(
    "status %d: returns a bodyless response without throwing, even when the backend result carries a non-empty body",
    async (status) => {
      const response = proxyResponse({ status, body: { message: "should be dropped" } });

      expect(response.status).toBe(status);
      const text = await response.text();
      expect(text).toBe("");
    }
  );

  it("regression check: calling NextResponse.json() directly (the pre-fix code path) throws for a 204 with a body — proxyResponse must not do this", async () => {
    const { NextResponse } = await import("next/server");
    expect(() => NextResponse.json({ message: "boom" }, { status: 204 })).toThrow();
  });

  it("every other status (e.g. 200) is forwarded via NextResponse.json with the body intact", async () => {
    const response = proxyResponse({ status: 200, body: { data: { id: 1 } } });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ data: { id: 1 } });
  });

  it("a 201 with a body is forwarded as JSON, not treated as a null-body status", async () => {
    const response = proxyResponse({ status: 201, body: { data: { id: 42 } } });

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json).toEqual({ data: { id: 42 } });
  });

  it("error statuses (e.g. 409 conflict, 422 validation, 401) still carry their body through as JSON", async () => {
    const conflict = proxyResponse({ status: 409, body: { message: "This address is attached to an order." } });
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({ message: "This address is attached to an order." });

    const validation = proxyResponse({ status: 422, body: { message: "Invalid.", errors: { rego: ["Too long."] } } });
    expect(validation.status).toBe(422);
    expect(await validation.json()).toEqual({ message: "Invalid.", errors: { rego: ["Too long."] } });
  });

  it("204 with an empty object body (the actual shape backend-client.ts's call() resolves to on a real empty-bodied response) doesn't throw", async () => {
    const response = proxyResponse({ status: 204, body: {} });
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});
