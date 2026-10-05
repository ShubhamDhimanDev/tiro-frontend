import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/customer/vehicles/route";
import { customerVehiclesBackend } from "@/lib/customer-vehicles/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import type { CustomerVehicleCreateInput } from "@/lib/customer-vehicles/types";

/**
 * `GET`/`POST /api/customer/vehicles` had zero test coverage before this
 * file — same class of gap `tests/unit/app/api/price-guarantee-claims/route.test.ts`
 * closed for that domain. Per this route's own docblock: `auth:customer`-only,
 * no guest fallback at all, `401` short-circuit with **no backend round
 * trip** when there's no session cookie, otherwise a verbatim status/body
 * passthrough via `proxyResponse()`.
 */

vi.mock("@/lib/customer-vehicles/backend", () => ({
  customerVehiclesBackend: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), setDefault: vi.fn() },
}));
vi.mock("@/lib/auth/cookies", () => ({
  getAuthToken: vi.fn(),
}));

const createInput: CustomerVehicleCreateInput = {
  label: "My Corolla",
  rego: "ABC123",
  state: "VIC",
  vin: null,
  vehicle_id: null,
  saved_fitment: { all: { width: 205, profile: 55, rim_diameter: 16 } },
};

function makePostRequest(body: CustomerVehicleCreateInput = createInput): Request {
  return new Request("http://localhost/api/customer/vehicles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/customer/vehicles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401s with no call to customerVehiclesBackend.list at all when getAuthToken returns nothing", async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ message: "You need to be signed in to view your saved vehicles." });
    expect(customerVehiclesBackend.list).not.toHaveBeenCalled();
  });

  it("with a token present, proxies to customerVehiclesBackend.list with the token and passes the response through verbatim", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    const backendBody = { data: [{ id: 1, label: "My Corolla", is_default: true }] };
    vi.mocked(customerVehiclesBackend.list).mockResolvedValue({ status: 200, body: backendBody });

    const response = await GET();
    const json = await response.json();

    expect(customerVehiclesBackend.list).toHaveBeenCalledWith("auth-tok-1");
    expect(response.status).toBe(200);
    expect(json).toEqual(backendBody);
  });

  it("replaces a 5xx backend body with the friendly error (no upstream text leaks)", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(customerVehiclesBackend.list).mockResolvedValue({ status: 500, body: { message: "Internal server error." } });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.code).toBe("server_error");
    expect(json.message).not.toContain("Internal server error");
  });
});

describe("POST /api/customer/vehicles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401s with no call to customerVehiclesBackend.create at all when getAuthToken returns nothing", async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);

    const response = await POST(makePostRequest());
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ message: "You need to be signed in to save a vehicle." });
    expect(customerVehiclesBackend.create).not.toHaveBeenCalled();
  });

  it("with a token present, proxies to customerVehiclesBackend.create with the token and parsed body", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(customerVehiclesBackend.create).mockResolvedValue({ status: 201, body: { data: { id: 5, ...createInput } } });

    const response = await POST(makePostRequest());
    await response.json();

    expect(customerVehiclesBackend.create).toHaveBeenCalledWith("auth-tok-1", createInput);
  });

  it("passes the backend's 422 validation error through verbatim", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    const errorBody = { message: "The given data was invalid.", errors: { saved_fitment: ["The saved fitment field is required."] } };
    vi.mocked(customerVehiclesBackend.create).mockResolvedValue({ status: 422, body: errorBody });

    const response = await POST(makePostRequest());
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json).toEqual(errorBody);
  });
});
