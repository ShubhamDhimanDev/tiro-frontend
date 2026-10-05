import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/customer/addresses/route";
import { customerAddressesBackend } from "@/lib/customer-addresses/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import type { CustomerAddressCreateInput } from "@/lib/customer-addresses/types";

/**
 * `GET`/`POST /api/customer/addresses` — zero test coverage before this
 * file. Same `401`-short-circuit/verbatim-passthrough posture as
 * `tests/unit/app/api/customer/vehicles/route.test.ts`.
 */

vi.mock("@/lib/customer-addresses/backend", () => ({
  customerAddressesBackend: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), setDefault: vi.fn() },
}));
vi.mock("@/lib/auth/cookies", () => ({
  getAuthToken: vi.fn(),
}));

const createInput: CustomerAddressCreateInput = {
  label: "Home",
  suburb_id: 3,
  line1: "1 Example St",
  line2: null,
  lat: -37.8136,
  lng: 144.9631,
  access_instructions: null,
};

function makePostRequest(body: CustomerAddressCreateInput = createInput): Request {
  return new Request("http://localhost/api/customer/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/customer/addresses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401s with no call to customerAddressesBackend.list at all when getAuthToken returns nothing", async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ message: "You need to be signed in to view your saved addresses." });
    expect(customerAddressesBackend.list).not.toHaveBeenCalled();
  });

  it("with a token present, proxies to customerAddressesBackend.list with the token and passes the response through verbatim", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    const backendBody = { data: [{ id: 1, label: "Home", is_default: true }] };
    vi.mocked(customerAddressesBackend.list).mockResolvedValue({ status: 200, body: backendBody });

    const response = await GET();
    const json = await response.json();

    expect(customerAddressesBackend.list).toHaveBeenCalledWith("auth-tok-1");
    expect(response.status).toBe(200);
    expect(json).toEqual(backendBody);
  });
});

describe("POST /api/customer/addresses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401s with no call to customerAddressesBackend.create at all when getAuthToken returns nothing", async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);

    const response = await POST(makePostRequest());
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ message: "You need to be signed in to save an address." });
    expect(customerAddressesBackend.create).not.toHaveBeenCalled();
  });

  it("with a token present, proxies to customerAddressesBackend.create with the token and parsed body", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    vi.mocked(customerAddressesBackend.create).mockResolvedValue({ status: 201, body: { data: { id: 9, ...createInput } } });

    const response = await POST(makePostRequest());
    await response.json();

    expect(customerAddressesBackend.create).toHaveBeenCalledWith("auth-tok-1", createInput);
  });

  it("passes the backend's 422 validation error through verbatim", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    const errorBody = { message: "The given data was invalid.", errors: { suburb_id: ["The selected suburb id is invalid."] } };
    vi.mocked(customerAddressesBackend.create).mockResolvedValue({ status: 422, body: errorBody });

    const response = await POST(makePostRequest());
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json).toEqual(errorBody);
  });
});
