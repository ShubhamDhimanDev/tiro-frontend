import { describe, expect, it, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "@/app/api/customer/vehicles/[vehicle]/route";
import { customerVehiclesBackend } from "@/lib/customer-vehicles/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import type { CustomerVehicleUpdateInput } from "@/lib/customer-vehicles/types";

/**
 * `PATCH`/`DELETE /api/customer/vehicles/{vehicle}` — zero test coverage
 * before this file. Same `401`-short-circuit/verbatim-passthrough posture as
 * `route.test.ts` (the collection endpoint), plus this is the first Route
 * Handler this app has ever proxied a real `204 No Content` through
 * (`DELETE`'s success case) — the exact bug class `lib/http/proxy-response.ts`
 * was added to fix (see that file's own test suite for the underlying Node
 * behavior this regresses against). Asserting a real `204` comes back with
 * an empty body *through this actual route handler*, not just through
 * `proxyResponse()` in isolation, is the point of the `DELETE` "success"
 * test below.
 */

vi.mock("@/lib/customer-vehicles/backend", () => ({
  customerVehiclesBackend: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), setDefault: vi.fn() },
}));
vi.mock("@/lib/auth/cookies", () => ({
  getAuthToken: vi.fn(),
}));

function makeParams(vehicle: string): { params: Promise<{ vehicle: string }> } {
  return { params: Promise.resolve({ vehicle }) };
}

function makePatchRequest(body: CustomerVehicleUpdateInput): Request {
  return new Request("http://localhost/api/customer/vehicles/5", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/customer/vehicles/[vehicle]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401s with no call to customerVehiclesBackend.update at all when getAuthToken returns nothing", async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ label: "Renamed" }), makeParams("5"));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ message: "You need to be signed in to update a saved vehicle." });
    expect(customerVehiclesBackend.update).not.toHaveBeenCalled();
  });

  it("with a token present, proxies to customerVehiclesBackend.update with the token, id, and parsed body", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(customerVehiclesBackend.update).mockResolvedValue({ status: 200, body: { data: { id: 5, label: "Renamed" } } });

    const response = await PATCH(makePatchRequest({ label: "Renamed" }), makeParams("5"));
    await response.json();

    expect(customerVehiclesBackend.update).toHaveBeenCalledWith("auth-tok-1", "5", { label: "Renamed" });
  });

  it("a mismatched/nonexistent id passes the backend's plain 404 through unmodified (no separate 403 branch)", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(customerVehiclesBackend.update).mockResolvedValue({ status: 404, body: { message: "Not found." } });

    const response = await PATCH(makePatchRequest({ label: "Renamed" }), makeParams("999"));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json).toEqual({ message: "Not found." });
  });
});

describe("DELETE /api/customer/vehicles/[vehicle]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401s with no call to customerVehiclesBackend.remove at all when getAuthToken returns nothing", async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost/api/customer/vehicles/5", { method: "DELETE" }), makeParams("5"));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ message: "You need to be signed in to remove a saved vehicle." });
    expect(customerVehiclesBackend.remove).not.toHaveBeenCalled();
  });

  it("on success, forwards a real 204 with an empty body without throwing (the proxy-response.ts regression this route was the first to hit)", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(customerVehiclesBackend.remove).mockResolvedValue({ status: 204, body: {} });

    const response = await DELETE(new Request("http://localhost/api/customer/vehicles/5", { method: "DELETE" }), makeParams("5"));

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(customerVehiclesBackend.remove).toHaveBeenCalledWith("auth-tok-1", "5");
  });
});
