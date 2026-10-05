import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PriceGuaranteeClaimForm } from "@/components/price-guarantee/claim-form";
import { priceGuaranteeApi } from "@/lib/price-guarantee/client-api";
import type { PublicCustomer } from "@/lib/auth/types";
import type { PriceGuaranteeApiResult } from "@/lib/price-guarantee/client-api";
import type { PriceGuaranteeClaimCreateResponse, PriceGuaranteeClaimRecord } from "@/lib/price-guarantee/types";

/**
 * `PriceGuaranteeClaimForm` state matrix — per the task brief: loading
 * skeleton while auth resolves, a sign-in prompt when signed out, the real
 * form when signed in, and a success message after submit; client-side
 * validates URL + price > 0 *before* ever calling the API;
 * `competitor_price` is submitted as `Math.round(dollars * 100)` cents; and
 * `validation_error` (422) maps `result.errors` into per-field errors via
 * `<FormField error=...>`. None of this had any coverage before this file —
 * this component is one of this round's newly-landed, previously-untested
 * files per the dispatch.
 *
 * `useAuth()` and `priceGuaranteeApi` are both mocked directly (same
 * boundary-mocking posture `tests/unit/app/api/orders/route.test.ts` uses for
 * its own backend/cookie dependencies) — this form's own docblock is explicit
 * that its auth gate is "UX only, never the security boundary" (the Route
 * Handler enforces the real 401), so a test double for `useAuth` is testing
 * exactly what this component is responsible for: reacting to auth state, not
 * re-deriving it.
 *
 * `fireEvent.submit(form)` (dispatched directly on the `<form>` node, not a
 * button click) is used throughout instead of clicking the submit button —
 * this bypasses jsdom's native HTML5 constraint validation (`required`,
 * `type="url"`, `min="0.01"` on the inputs), which would otherwise silently
 * swallow the submit event before this component's own `handleSubmit` ever
 * runs, for exactly the "invalid input" cases these tests need to reach.
 */
vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock("@/lib/price-guarantee/client-api", () => ({
  priceGuaranteeApi: { create: vi.fn(), list: vi.fn() },
}));

const mockUseAuth = vi.fn();

const fixtureCustomer: PublicCustomer = { id: 1, name: "Jess Nguyen", email: "jess@example.com", mobile: null };

function makeClaimRecord(overrides: Partial<PriceGuaranteeClaimRecord> = {}): PriceGuaranteeClaimRecord {
  return {
    id: 9,
    status: "pending",
    competitor_url: "https://competitor.example.com/product",
    competitor_price: 18900,
    tyre_variant_id: 5,
    order_id: null,
    approved_discount_amount: null,
    expires_at: null,
    redeemed_at: null,
    admin_note: null,
    created_at: "2026-09-22T00:00:00+00:00",
    ...overrides,
  };
}

function successResult(record: PriceGuaranteeClaimRecord): PriceGuaranteeApiResult<PriceGuaranteeClaimCreateResponse> {
  return { kind: "success", status: 201, data: { data: record } };
}

function getForm(container: HTMLElement): HTMLFormElement {
  const form = container.querySelector("form");
  if (!form) throw new Error("Expected a <form> to be rendered");
  return form;
}

function fillForm(urlValue: string, priceValue: string) {
  fireEvent.change(screen.getByLabelText("Competitor's product URL"), { target: { value: urlValue } });
  fireEvent.change(screen.getByLabelText("Competitor's price (AUD)"), { target: { value: priceValue } });
}

describe("PriceGuaranteeClaimForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("auth-driven render states", () => {
    it("renders a loading skeleton while auth is still resolving, no form or sign-in prompt", () => {
      mockUseAuth.mockReturnValue({ customer: null, loading: true });
      const { container } = render(<PriceGuaranteeClaimForm tyreVariantId={5} />);

      expect(container.querySelector("[aria-hidden]")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByText(/Sign in to submit/)).not.toBeInTheDocument();
    });

    it("renders a sign-in prompt (not the form) when signed out", () => {
      mockUseAuth.mockReturnValue({ customer: null, loading: false });
      render(<PriceGuaranteeClaimForm tyreVariantId={5} />);

      expect(screen.getByText("Sign in to submit a price-match claim.")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
      expect(screen.queryByLabelText("Competitor's product URL")).not.toBeInTheDocument();
    });

    it("renders the real form when signed in, including the optional label and order-id context lines", () => {
      mockUseAuth.mockReturnValue({ customer: fixtureCustomer, loading: false });
      render(<PriceGuaranteeClaimForm tyreVariantId={5} orderId={42} label="Bridgestone Turanza T005 205/55 R16" />);

      expect(screen.getByLabelText("Competitor's product URL")).toBeInTheDocument();
      expect(screen.getByLabelText("Competitor's price (AUD)")).toBeInTheDocument();
      expect(screen.getByText(/Claiming a price match for/)).toBeInTheDocument();
      expect(screen.getByText("Bridgestone Turanza T005 205/55 R16")).toBeInTheDocument();
      expect(screen.getByText("Linked to order #42 (post-purchase claim).")).toBeInTheDocument();
    });

    it("omits the label and order-id lines entirely when neither is supplied (pre-purchase claim)", () => {
      mockUseAuth.mockReturnValue({ customer: fixtureCustomer, loading: false });
      render(<PriceGuaranteeClaimForm tyreVariantId={5} />);

      expect(screen.queryByText(/Claiming a price match for/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Linked to order/)).not.toBeInTheDocument();
    });
  });

  describe("client-side validation (must not call the API at all)", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ customer: fixtureCustomer, loading: false });
    });

    it("rejects an empty URL even with a valid price", () => {
      const { container } = render(<PriceGuaranteeClaimForm tyreVariantId={5} />);
      fillForm("", "189.00");
      fireEvent.submit(getForm(container));

      expect(screen.getByText("Enter a valid competitor URL and price.")).toBeInTheDocument();
      expect(priceGuaranteeApi.create).not.toHaveBeenCalled();
    });

    it("rejects a zero price even with a valid URL", () => {
      const { container } = render(<PriceGuaranteeClaimForm tyreVariantId={5} />);
      fillForm("https://competitor.example.com/product", "0");
      fireEvent.submit(getForm(container));

      expect(screen.getByText("Enter a valid competitor URL and price.")).toBeInTheDocument();
      expect(priceGuaranteeApi.create).not.toHaveBeenCalled();
    });

    it("rejects a negative price", () => {
      const { container } = render(<PriceGuaranteeClaimForm tyreVariantId={5} />);
      fillForm("https://competitor.example.com/product", "-5");
      fireEvent.submit(getForm(container));

      expect(screen.getByText("Enter a valid competitor URL and price.")).toBeInTheDocument();
      expect(priceGuaranteeApi.create).not.toHaveBeenCalled();
    });

    it("rejects a non-numeric price", () => {
      const { container } = render(<PriceGuaranteeClaimForm tyreVariantId={5} />);
      fillForm("https://competitor.example.com/product", "not-a-number");
      fireEvent.submit(getForm(container));

      expect(screen.getByText("Enter a valid competitor URL and price.")).toBeInTheDocument();
      expect(priceGuaranteeApi.create).not.toHaveBeenCalled();
    });
  });

  describe("dollars -> cents conversion (competitor_price = Math.round(dollars * 100))", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ customer: fixtureCustomer, loading: false });
      vi.mocked(priceGuaranteeApi.create).mockResolvedValue(successResult(makeClaimRecord()));
    });

    it("converts a clean two-decimal dollar amount exactly (189.00 -> 18900 cents)", async () => {
      const { container } = render(<PriceGuaranteeClaimForm tyreVariantId={5} />);
      fillForm("https://competitor.example.com/product", "189.00");
      fireEvent.submit(getForm(container));

      await screen.findByText(/Your price-match claim has been submitted/);
      expect(priceGuaranteeApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ competitor_price: 18900 })
      );
    });

    /**
     * `19.99 * 100` is `1998.9999999999998` in IEEE-754 floating point, not
     * exactly `1999` — a naive `parseInt(dollars * 100)` would truncate this
     * to `1998` cents ($0.01 short). `Math.round` is what actually rescues
     * this to the correct `1999`, which is exactly why the task brief called
     * out "a couple of specific dollar-to-cents conversion cases" rather than
     * treating this as an incidental detail.
     */
    it("rounds a floating-point-imprecise amount correctly (19.99 -> 1999 cents, not 1998)", async () => {
      const { container } = render(<PriceGuaranteeClaimForm tyreVariantId={5} />);
      fillForm("https://competitor.example.com/product", "19.99");
      fireEvent.submit(getForm(container));

      await screen.findByText(/Your price-match claim has been submitted/);
      expect(priceGuaranteeApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ competitor_price: 1999 })
      );
    });

    it("defaults order_id to null when no orderId prop is supplied (pre-purchase claim)", async () => {
      const { container } = render(<PriceGuaranteeClaimForm tyreVariantId={5} />);
      fillForm("https://competitor.example.com/product", "100.00");
      fireEvent.submit(getForm(container));

      await screen.findByText(/Your price-match claim has been submitted/);
      expect(priceGuaranteeApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ tyre_variant_id: 5, order_id: null, competitor_price: 10000 })
      );
    });

    it("passes a supplied orderId through untouched (post-purchase claim)", async () => {
      const { container } = render(<PriceGuaranteeClaimForm tyreVariantId={5} orderId={42} />);
      fillForm("https://competitor.example.com/product", "100.00");
      fireEvent.submit(getForm(container));

      await screen.findByText(/Your price-match claim has been submitted/);
      expect(priceGuaranteeApi.create).toHaveBeenCalledWith(expect.objectContaining({ order_id: 42 }));
    });
  });

  describe("submission outcomes", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ customer: fixtureCustomer, loading: false });
    });

    it("shows a submitting state and disables the button while the request is in flight, then the success message once it resolves", async () => {
      let resolveCreate!: (value: PriceGuaranteeApiResult<PriceGuaranteeClaimCreateResponse>) => void;
      vi.mocked(priceGuaranteeApi.create).mockReturnValue(
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
      );

      const { container } = render(<PriceGuaranteeClaimForm tyreVariantId={5} />);
      fillForm("https://competitor.example.com/product", "189.00");
      fireEvent.submit(getForm(container));

      expect(await screen.findByRole("button", { name: "Submitting…" })).toBeDisabled();

      resolveCreate(successResult(makeClaimRecord()));

      expect(await screen.findByText(/Your price-match claim has been submitted/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "View your claims" })).toHaveAttribute("href", "/price-guarantee-claims");
    });

    it("maps a validation_error (422) response into per-field errors via FormField, plus the top-level message", async () => {
      vi.mocked(priceGuaranteeApi.create).mockResolvedValue({
        kind: "validation_error",
        status: 422,
        message: "The given data was invalid.",
        errors: {
          competitor_url: ["The competitor url field must be a valid URL."],
          competitor_price: ["The competitor price must be greater than 0."],
        },
      });

      const { container } = render(<PriceGuaranteeClaimForm tyreVariantId={5} />);
      fillForm("https://competitor.example.com/product", "189.00");
      fireEvent.submit(getForm(container));

      expect(await screen.findByText("The given data was invalid.")).toBeInTheDocument();
      expect(screen.getByText("The competitor url field must be a valid URL.")).toBeInTheDocument();
      expect(screen.getByText("The competitor price must be greater than 0.")).toBeInTheDocument();
      // Stays on the form — no success state reached.
      expect(screen.queryByText(/Your price-match claim has been submitted/)).not.toBeInTheDocument();
    });

    it("shows the generic error message for a non-validation failure (e.g. unknown_error) without touching fieldErrors", async () => {
      vi.mocked(priceGuaranteeApi.create).mockResolvedValue({
        kind: "unknown_error",
        status: 500,
        message: "Something went wrong.",
      });

      const { container } = render(<PriceGuaranteeClaimForm tyreVariantId={5} />);
      fillForm("https://competitor.example.com/product", "189.00");
      fireEvent.submit(getForm(container));

      expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
      expect(screen.queryByText(/Your price-match claim has been submitted/)).not.toBeInTheDocument();
    });
  });
});
