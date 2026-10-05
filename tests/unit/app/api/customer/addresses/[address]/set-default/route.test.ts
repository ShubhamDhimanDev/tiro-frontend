import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/customer/addresses/[address]/set-default/route";
import { customerAddressesBackend } from "@/lib/customer-addresses/backend";
import { getAuthToken } from "@/lib/auth/cookies";

/** `POST /api/customer/addresses/{address}/set-default` — zero test coverage before this file. Same `401`-short-circuit posture as every other Phase 7 route. */

vi.mock("@/lib/customer-addresses/backend", () => ({
  customerAddressesBackend: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), setDefault: vi.fn() },
}));
vi.mock("@/lib/auth/cookies", () => ({
  getAuthToken: vi.fn(),
}));

function makeParams(address: string): { params: Promise<{ address: string }> } {
  return { params: Promise.resolve({ address }) };
}

function makeRequest(address: string): Request {
  return new Request(`http://localhost/api/customer/addresses/${address}/set-default`, { method: "POST" });
}

describe("POST /api/customer/addresses/[address]/set-default", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401s with no call to customerAddressesBackend.setDefault at all when getAuthToken returns nothing", async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);

    const response = await POST(makeRequest("9"), makeParams("9"));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ message: "You need to be signed in to update a saved address." });
    expect(customerAddressesBackend.setDefault).not.toHaveBeenCalled();
  });

  it("with a token present, proxies to customerAddressesBackend.setDefault with the token and id, forwarding the resulting record", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(customerAddressesBackend.setDefault).mockResolvedValue({ status: 200, body: { data: { id: 9, is_default: true } } });

    const response = await POST(makeRequest("9"), makeParams("9"));
    const json = await response.json();

    expect(customerAddressesBackend.setDefault).toHaveBeenCalledWith("auth-tok-1", "9");
    expect(response.status).toBe(200);
    expect(json).toEqual({ data: { id: 9, is_default: true } });
  });
});
