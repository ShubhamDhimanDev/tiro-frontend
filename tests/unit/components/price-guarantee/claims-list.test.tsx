import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceGuaranteeClaimsList } from "@/components/price-guarantee/claims-list";
import { priceGuaranteeApi } from "@/lib/price-guarantee/client-api";
import type { PublicCustomer } from "@/lib/auth/types";
import type { PriceGuaranteeApiResult } from "@/lib/price-guarantee/client-api";
import type { PriceGuaranteeClaimListResponse, PriceGuaranteeClaimRecord } from "@/lib/price-guarantee/types";

/**
 * `PriceGuaranteeClaimsList` state matrix — per the task brief:
 * loading/signed-out/error/empty/ready states, a status badge per claim
 * (incidentally exercising `<ClaimStatusBadge>` rather than via a dedicated
 * file, per the brief's own suggestion), competitor price + link, the
 * `order_id`-linked text when present, and the 3-way branch for approved
 * claims (`redeemed_at` set / `expires_at` set / neither). No prior coverage
 * of this component existed at all before this file.
 *
 * Same mocking boundary as `claim-form.test.tsx`: `useAuth()` and
 * `priceGuaranteeApi` are both test doubles, not the real fetch/cookie
 * machinery — this component's own docblock defers to the Route Handler as
 * the actual security boundary, same as the form.
 *
 * Per qa-lead's own scope note: there are no pagination *controls* in this
 * UI yet — `meta` is fetched but never rendered — so the "multi-page data"
 * case below asserts that absence directly (no "next page" affordance
 * appears) rather than treating it as a gap to work around.
 */
vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock("@/lib/price-guarantee/client-api", () => ({
  priceGuaranteeApi: { create: vi.fn(), list: vi.fn() },
}));

const mockUseAuth = vi.fn();

const fixtureCustomer: PublicCustomer = { id: 1, name: "Jess Nguyen", email: "jess@example.com", mobile: null };

function makeClaim(overrides: Partial<PriceGuaranteeClaimRecord> = {}): PriceGuaranteeClaimRecord {
  return {
    id: 1,
    status: "pending",
    competitor_url: "https://competitor.example.com/product",
    competitor_price: 15900,
    tyre_variant_id: 5,
    order_id: null,
    approved_discount_amount: null,
    expires_at: null,
    redeemed_at: null,
    admin_note: null,
    created_at: "2026-09-01T00:00:00+00:00",
    ...overrides,
  };
}

function listResult(
  claims: PriceGuaranteeClaimRecord[],
  metaOverrides: Partial<PriceGuaranteeClaimListResponse["meta"]> = {}
): PriceGuaranteeApiResult<PriceGuaranteeClaimListResponse> {
  return {
    kind: "success",
    status: 200,
    data: {
      data: claims,
      meta: { current_page: 1, per_page: 20, total: claims.length, last_page: 1, ...metaOverrides },
      links: { next: null, prev: null },
    },
  };
}

describe("PriceGuaranteeClaimsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a loading skeleton while auth is resolving and never calls the API", () => {
    mockUseAuth.mockReturnValue({ customer: null, loading: true });
    const { container } = render(<PriceGuaranteeClaimsList />);

    expect(container.querySelector("[aria-hidden]")).toBeInTheDocument();
    expect(priceGuaranteeApi.list).not.toHaveBeenCalled();
  });

  it("renders a sign-in prompt when signed out and never calls the API", () => {
    mockUseAuth.mockReturnValue({ customer: null, loading: false });
    render(<PriceGuaranteeClaimsList />);

    expect(screen.getByText("Sign in to see your price-match claims.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(priceGuaranteeApi.list).not.toHaveBeenCalled();
  });

  it("shows a loading skeleton once signed in while the list request is still in flight", () => {
    mockUseAuth.mockReturnValue({ customer: fixtureCustomer, loading: false });
    vi.mocked(priceGuaranteeApi.list).mockReturnValue(new Promise(() => {})); // never resolves

    const { container } = render(<PriceGuaranteeClaimsList />);

    expect(container.querySelector("[aria-hidden]")).toBeInTheDocument();
    expect(priceGuaranteeApi.list).toHaveBeenCalledTimes(1);
  });

  it("renders the error message (role=alert) when the list call doesn't succeed", async () => {
    mockUseAuth.mockReturnValue({ customer: fixtureCustomer, loading: false });
    vi.mocked(priceGuaranteeApi.list).mockResolvedValue({
      kind: "unknown_error",
      status: 500,
      message: "Something went wrong.",
    });

    render(<PriceGuaranteeClaimsList />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong.");
  });

  it("renders the empty state when the customer has no claims yet", async () => {
    mockUseAuth.mockReturnValue({ customer: fixtureCustomer, loading: false });
    vi.mocked(priceGuaranteeApi.list).mockResolvedValue(listResult([]));

    render(<PriceGuaranteeClaimsList />);

    expect(await screen.findByText(/haven.t submitted any price-match claims yet/)).toBeInTheDocument();
  });

  describe("ready state — per-claim rendering", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ customer: fixtureCustomer, loading: false });
    });

    it("renders competitor price (formatted) and a working link to the competitor listing", async () => {
      vi.mocked(priceGuaranteeApi.list).mockResolvedValue(
        listResult([makeClaim({ competitor_price: 15900, competitor_url: "https://rival.example.com/tyre" })])
      );

      render(<PriceGuaranteeClaimsList />);

      expect(await screen.findByText(/\$159\.00/)).toBeInTheDocument();
      const link = screen.getByRole("link", { name: "view listing" });
      expect(link).toHaveAttribute("href", "https://rival.example.com/tyre");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("shows the linked order text when order_id is present", async () => {
      vi.mocked(priceGuaranteeApi.list).mockResolvedValue(listResult([makeClaim({ order_id: 77 })]));

      render(<PriceGuaranteeClaimsList />);

      expect(await screen.findByText("Linked to order #77")).toBeInTheDocument();
    });

    it("omits the linked-order text entirely for a pre-purchase claim (order_id null)", async () => {
      vi.mocked(priceGuaranteeApi.list).mockResolvedValue(listResult([makeClaim({ order_id: null })]));

      render(<PriceGuaranteeClaimsList />);

      await screen.findByText(/\$159\.00/);
      expect(screen.queryByText(/Linked to order/)).not.toBeInTheDocument();
    });

    it.each([
      ["pending", "Pending review"],
      ["approved", "Approved"],
      ["rejected", "Rejected"],
    ] as const)("renders the %s status badge as %s", async (status, expectedLabel) => {
      const overrides: Partial<PriceGuaranteeClaimRecord> =
        status === "approved"
          ? { status, approved_discount_amount: 2000 }
          : status === "rejected"
            ? { status, admin_note: "Not a matching competitor listing." }
            : { status };
      vi.mocked(priceGuaranteeApi.list).mockResolvedValue(listResult([makeClaim(overrides)]));

      render(<PriceGuaranteeClaimsList />);

      expect(await screen.findByText(expectedLabel)).toBeInTheDocument();
    });

    it("rejected claims show admin_note as the reason", async () => {
      vi.mocked(priceGuaranteeApi.list).mockResolvedValue(
        listResult([makeClaim({ status: "rejected", admin_note: "Not a matching competitor listing." })])
      );

      render(<PriceGuaranteeClaimsList />);

      expect(await screen.findByText("Reason: Not a matching competitor listing.")).toBeInTheDocument();
    });

    describe("approved claims — 3-way trailing-text branch", () => {
      it("shows 'already applied' when redeemed_at is set, regardless of expires_at", async () => {
        vi.mocked(priceGuaranteeApi.list).mockResolvedValue(
          listResult([
            makeClaim({
              status: "approved",
              approved_discount_amount: 2000,
              redeemed_at: "2026-09-10T00:00:00+00:00",
              expires_at: "2026-10-01T00:00:00+00:00",
            }),
          ])
        );

        render(<PriceGuaranteeClaimsList />);

        expect(await screen.findByText(/Approved discount: \$20\.00 — already applied\./)).toBeInTheDocument();
      });

      it("shows the expiry date prompt when expires_at is set and redeemed_at is not", async () => {
        const expiresAtIso = "2026-10-01T00:00:00+00:00";
        const expectedDate = new Date(expiresAtIso).toLocaleDateString("en-AU");
        vi.mocked(priceGuaranteeApi.list).mockResolvedValue(
          listResult([
            makeClaim({
              status: "approved",
              approved_discount_amount: 2000,
              redeemed_at: null,
              expires_at: expiresAtIso,
            }),
          ])
        );

        render(<PriceGuaranteeClaimsList />);

        expect(
          await screen.findByText(`Approved discount: $20.00 — apply it to an order before ${expectedDate}.`)
        ).toBeInTheDocument();
      });

      it("shows no trailing text at all when neither redeemed_at nor expires_at is set", async () => {
        vi.mocked(priceGuaranteeApi.list).mockResolvedValue(
          listResult([
            makeClaim({ status: "approved", approved_discount_amount: 2000, redeemed_at: null, expires_at: null }),
          ])
        );

        render(<PriceGuaranteeClaimsList />);

        const line = await screen.findByText(/Approved discount: \$20\.00/);
        expect(line).toHaveTextContent("Approved discount: $20.00");
        expect(line.textContent).not.toMatch(/already applied|apply it/);
      });
    });

    it("renders every claim in the list, not just the first", async () => {
      vi.mocked(priceGuaranteeApi.list).mockResolvedValue(
        listResult([
          makeClaim({ id: 1, competitor_price: 10000 }),
          makeClaim({ id: 2, competitor_price: 20000 }),
          makeClaim({ id: 3, competitor_price: 30000 }),
        ])
      );

      render(<PriceGuaranteeClaimsList />);

      expect(await screen.findByText(/\$100\.00/)).toBeInTheDocument();
      expect(screen.getByText(/\$200\.00/)).toBeInTheDocument();
      expect(screen.getByText(/\$300\.00/)).toBeInTheDocument();
    });

    it("renders only the current page's claims and no pagination controls, even when meta reports more pages exist (tracked backlog, not a defect)", async () => {
      vi.mocked(priceGuaranteeApi.list).mockResolvedValue(
        listResult([makeClaim({ id: 1 })], { current_page: 1, per_page: 1, total: 5, last_page: 5 })
      );

      render(<PriceGuaranteeClaimsList />);

      await screen.findByText(/\$159\.00/);
      expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/page 1 of 5/i)).not.toBeInTheDocument();
    });
  });
});
