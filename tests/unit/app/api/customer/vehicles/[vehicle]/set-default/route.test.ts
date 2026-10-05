import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/customer/vehicles/[vehicle]/set-default/route";
import { customerVehiclesBackend } from "@/lib/customer-vehicles/backend";
import { getAuthToken } from "@/lib/auth/cookies";

/** `POST /api/customer/vehicles/{vehicle}/set-default` — zero test coverage before this file. Same `401`-short-circuit posture as every other Phase 7 route. */

vi.mock("@/lib/customer-vehicles/backend", () => ({
  customerVehiclesBackend: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), setDefault: vi.fn() },
}));
vi.mock("@/lib/auth/cookies", () => ({
  getAuthToken: vi.fn(),
}));

function makeParams(vehicle: string): { params: Promise<{ vehicle: string }> } {
  return { params: Promise.resolve({ vehicle }) };
}

function makeRequest(vehicle: string): Request {
  return new Request(`http://localhost/api/customer/vehicles/${vehicle}/set-default`, { method: "POST" });
}

describe("POST /api/customer/vehicles/[vehicle]/set-default", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401s with no call to customerVehiclesBackend.setDefault at all when getAuthToken returns nothing", async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);

    const response = await POST(makeRequest("5"), makeParams("5"));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ message: "You need to be signed in to update a saved vehicle." });
    expect(customerVehiclesBackend.setDefault).not.toHaveBeenCalled();
  });

  it("with a token present, proxies to customerVehiclesBackend.setDefault with the token and id, forwarding the resulting record", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(customerVehiclesBackend.setDefault).mockResolvedValue({ status: 200, body: { data: { id: 5, is_default: true } } });

    const response = await POST(makeRequest("5"), makeParams("5"));
    const json = await response.json();

    expect(customerVehiclesBackend.setDefault).toHaveBeenCalledWith("auth-tok-1", "5");
    expect(response.status).toBe(200);
    expect(json).toEqual({ data: { id: 5, is_default: true } });
  });
});
