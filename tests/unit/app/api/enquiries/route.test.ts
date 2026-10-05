import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/enquiries/route";
import { enquiriesBackend } from "@/lib/enquiries/backend";

vi.mock("@/lib/enquiries/backend", () => ({ enquiriesBackend: { submit: vi.fn() } }));

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/enquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const valid = { type: "contact", name: "Jane Citizen", email: "jane@example.com", message: "Do you fit run-flat tyres?", website: "" };

describe("POST /api/enquiries", () => {
  beforeEach(() => {
    vi.mocked(enquiriesBackend.submit).mockReset();
  });

  it("proxies a valid enquiry and returns the API's 201 body (reference only)", async () => {
    const body = { data: { reference: "ENQ-7K3P9XQ2", type: "contact", message: "Thanks, we've got your message." } };
    vi.mocked(enquiriesBackend.submit).mockResolvedValue({ status: 201, body });

    const res = await POST(post(valid, { "x-forwarded-for": "203.0.113.9, 10.0.0.1" }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(body);
    expect(enquiriesBackend.submit).toHaveBeenCalledWith(
      { type: "contact", name: "Jane Citizen", email: "jane@example.com", message: "Do you fit run-flat tyres?", website: "" },
      { clientIp: "203.0.113.9" },
    );
  });

  it("validates on the server with the contract's wording and never calls Laravel", async () => {
    const res = await POST(post({ type: "quote", name: "", email: "bad" }));
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.errors.name).toEqual(["Please tell us your name."]);
    expect(json.errors.email[0]).toMatch(/does not look right/);
    expect(json.errors.phone[0]).toMatch(/phone number/);
    expect(json.message).toMatch(/more errors\)$/);
    expect(enquiriesBackend.submit).not.toHaveBeenCalled();
  });

  it("drops unknown fields instead of forwarding them", async () => {
    vi.mocked(enquiriesBackend.submit).mockResolvedValue({ status: 201, body: { data: { reference: "ENQ-1" } } });
    await POST(post({ ...valid, is_admin: true, ip_address: "1.2.3.4" }));
    const payload = vi.mocked(enquiriesBackend.submit).mock.calls[0][0];
    expect(payload).not.toHaveProperty("is_admin");
    expect(payload).not.toHaveProperty("ip_address");
  });

  it("forwards a filled honeypot without validating, so a bot learns nothing", async () => {
    vi.mocked(enquiriesBackend.submit).mockResolvedValue({ status: 201, body: { data: { reference: "ENQ-FAKE" } } });
    const res = await POST(post({ type: "contact", website: "http://spam.example" }));
    expect(res.status).toBe(201);
    expect(vi.mocked(enquiriesBackend.submit).mock.calls[0][0]).toMatchObject({ website: "http://spam.example" });
  });

  it("keeps Retry-After on a 429", async () => {
    vi.mocked(enquiriesBackend.submit).mockResolvedValue({ status: 429, body: { message: "Too Many Attempts." }, retryAfter: "42" });
    const res = await POST(post(valid));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
  });

  it("passes the API's 422 through", async () => {
    const body = { message: "Please tell us your name.", errors: { name: ["Please tell us your name."] } };
    vi.mocked(enquiriesBackend.submit).mockResolvedValue({ status: 422, body });
    const res = await POST(post(valid));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual(body);
  });

  it("rejects a body that is not JSON with a 422", async () => {
    const res = await POST(post("not json"));
    expect(res.status).toBe(422);
    expect(enquiriesBackend.submit).not.toHaveBeenCalled();
  });

  it("never logs the submitted details", async () => {
    const spies = [vi.spyOn(console, "log"), vi.spyOn(console, "error"), vi.spyOn(console, "warn"), vi.spyOn(console, "info")];
    vi.mocked(enquiriesBackend.submit).mockResolvedValue({ status: 201, body: { data: { reference: "ENQ-1" } } });
    await POST(post(valid));
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
  });
});
