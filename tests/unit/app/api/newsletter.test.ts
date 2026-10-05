import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/newsletter/backend-client", () => ({ liveNewsletterBackend: { subscribe: vi.fn() } }));

import { liveNewsletterBackend } from "@/lib/newsletter/backend-client";
import { POST } from "@/app/api/newsletter/route";

const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request("http://localhost/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => vi.mocked(liveNewsletterBackend.subscribe).mockReset());

describe("POST /api/newsletter", () => {
  it("rejects a bad email locally without calling the API", async () => {
    const res = await post({ email: "nope" });
    expect(res.status).toBe(422);
    expect((await res.json()).errors.email[0]).toMatch(/email/i);
    expect(liveNewsletterBackend.subscribe).not.toHaveBeenCalled();
  });

  it("forwards a valid signup with a known source, the visitor IP and an empty honeypot", async () => {
    vi.mocked(liveNewsletterBackend.subscribe).mockResolvedValue({ status: 201, body: { data: { message: "ok" } } });
    const res = await post({ email: " a@b.co ", first_name: "Sam", source: "home", extra: "x" }, { "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(res.status).toBe(201);
    expect(liveNewsletterBackend.subscribe).toHaveBeenCalledWith(
      { email: "a@b.co", first_name: "Sam", source: "home", website: "" },
      { clientIp: "1.2.3.4" },
    );
  });

  it("falls back to source=home for an unknown source", async () => {
    vi.mocked(liveNewsletterBackend.subscribe).mockResolvedValue({ status: 201, body: {} });
    await post({ email: "a@b.co", source: "hacker" });
    expect(vi.mocked(liveNewsletterBackend.subscribe).mock.calls[0][0]).toMatchObject({ source: "home" });
  });

  it("forwards a filled honeypot without validating", async () => {
    vi.mocked(liveNewsletterBackend.subscribe).mockResolvedValue({ status: 201, body: {} });
    const res = await post({ email: "", website: "spam" });
    expect(res.status).toBe(201);
  });

  it("keeps Retry-After on 429", async () => {
    vi.mocked(liveNewsletterBackend.subscribe).mockResolvedValue({ status: 429, body: { message: "Too Many Attempts." }, retryAfter: "42" });
    const res = await post({ email: "a@b.co" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
  });
});
