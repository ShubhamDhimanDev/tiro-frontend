import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/suburbs/route";
import { suburbsBackend } from "@/lib/suburbs/backend";

/**
 * `GET /api/suburbs`'s whole job, per its own docblock, is a thin proxy to
 * `GET /api/v1/suburbs` — forwarding query params (present-or-absent, not
 * defaulted to empty strings) and passing the backend's status/body straight
 * through. Same "mock the one collaborator" style as
 * `tests/unit/app/api/booking/route.test.ts`.
 */

vi.mock("@/lib/suburbs/backend", () => ({
  suburbsBackend: { lookup: vi.fn() },
}));

function makeRequest(query: string): Request {
  return new Request(`http://localhost/api/suburbs${query}`);
}

describe("GET /api/suburbs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards postcode and name to the backend and returns its 200 body untouched", async () => {
    const body = { data: [{ id: 88, name: "Richmond", state: "VIC", postcode: "3121" }] };
    vi.mocked(suburbsBackend.lookup).mockResolvedValue({ status: 200, body });

    const response = await GET(makeRequest("?postcode=3121&name=Richmond"));
    const json = await response.json();

    expect(suburbsBackend.lookup).toHaveBeenCalledWith("3121", "Richmond");
    expect(response.status).toBe(200);
    expect(json).toEqual(body);
  });

  it("passes params through as null when absent, rather than empty strings", async () => {
    vi.mocked(suburbsBackend.lookup).mockResolvedValue({
      status: 422,
      body: { message: "The given data was invalid.", errors: { postcode: ["required"], name: ["required"] } },
    });

    await GET(makeRequest(""));

    expect(suburbsBackend.lookup).toHaveBeenCalledWith(null, null);
  });

  it("passes a malformed-postcode 422 straight through", async () => {
    const body = { message: "The given data was invalid.", errors: { postcode: ["The postcode must be a 4-digit number."] } };
    vi.mocked(suburbsBackend.lookup).mockResolvedValue({ status: 422, body });

    const response = await GET(makeRequest("?postcode=abc&name=Richmond"));
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json).toEqual(body);
  });

  it("passes a no-match 200 with an empty data array straight through", async () => {
    const body = { data: [] };
    vi.mocked(suburbsBackend.lookup).mockResolvedValue({ status: 200, body });

    const response = await GET(makeRequest("?postcode=9999&name=Nowhereville"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(body);
  });
});
