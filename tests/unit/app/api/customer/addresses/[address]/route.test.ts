import { describe, expect, it, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "@/app/api/customer/addresses/[address]/route";
import { customerAddressesBackend } from "@/lib/customer-addresses/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import type { CustomerAddressUpdateInput } from "@/lib/customer-addresses/types";

/**
 * `PATCH`/`DELETE /api/customer/addresses/{address}` — zero test coverage
 * before this file. `DELETE` covers two things no other route test in this
 * suite combines: the `204`-with-empty-body proxy-response regression (see
 * `tests/unit/app/api/customer/vehicles/[vehicle]/route.test.ts`'s DELETE
 * suite for the same check on that sibling domain) *and* the `409`
 * still-referenced-by-an-order passthrough this domain alone has.
 */

vi.mock("@/lib/customer-addresses/backend", () => ({
  customerAddressesBackend: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), setDefault: vi.fn() },
}));
vi.mock("@/lib/auth/cookies", () => ({
  getAuthToken: vi.fn(),
}));

function makeParams(address: string): { params: Promise<{ address: string }> } {
  return { params: Promise.resolve({ address }) };
}

function makePatchRequest(body: CustomerAddressUpdateInput): Request {
  return new Request("http://localhost/api/customer/addresses/9", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/customer/addresses/[address]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401s with no call to customerAddressesBackend.update at all when getAuthToken returns nothing", async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ label: "Work" }), makeParams("9"));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ message: "You need to be signed in to update a saved address." });
    expect(customerAddressesBackend.update).not.toHaveBeenCalled();
  });

  it("with a token present, proxies to customerAddressesBackend.update with the token, id, and parsed body", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(customerAddressesBackend.update).mockResolvedValue({ status: 200, body: { data: { id: 9, label: "Work" } } });

    const response = await PATCH(makePatchRequest({ label: "Work" }), makeParams("9"));
    await response.json();

    expect(customerAddressesBackend.update).toHaveBeenCalledWith("auth-tok-1", "9", { label: "Work" });
  });
});

describe("DELETE /api/customer/addresses/[address]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401s with no call to customerAddressesBackend.remove at all when getAuthToken returns nothing", async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost/api/customer/addresses/9", { method: "DELETE" }), makeParams("9"));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ message: "You need to be signed in to remove a saved address." });
    expect(customerAddressesBackend.remove).not.toHaveBeenCalled();
  });

  it("on success, forwards a real 204 with an empty body without throwing (the proxy-response.ts regression)", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(customerAddressesBackend.remove).mockResolvedValue({ status: 204, body: {} });

    const response = await DELETE(new Request("http://localhost/api/customer/addresses/9", { method: "DELETE" }), makeParams("9"));

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(customerAddressesBackend.remove).toHaveBeenCalledWith("auth-tok-1", "9");
  });

  it("passes a 409 (still referenced by an order/booking) through unmodified, with its message intact", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    const conflictBody = { message: "This address is attached to an order and can't be removed — you can stop it being your default instead." };
    vi.mocked(customerAddressesBackend.remove).mockResolvedValue({ status: 409, body: conflictBody });

    const response = await DELETE(new Request("http://localhost/api/customer/addresses/9", { method: "DELETE" }), makeParams("9"));
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json).toEqual(conflictBody);
  });
});
