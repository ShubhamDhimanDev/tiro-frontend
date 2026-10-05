import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NewPriceGuaranteeClaimPage from "@/app/price-guarantee-claims/new/page";

/**
 * `app/price-guarantee-claims/new/page.tsx` — a server component whose
 * `searchParams` prop is itself a `Promise` (this Next.js version's App
 * Router convention — see frontend/AGENTS.md's pointer to read the
 * regenerated docs fresh; confirmed directly against this file's own
 * signature: `searchParams: Promise<Record<string, string | string[] |
 * undefined>>`). No existing test in this codebase exercises an async
 * server component's `page.tsx` directly (every prior `tests/unit/app/**`
 * file only covers Route Handlers, which are already plain async
 * functions) — since this component is likewise just a plain async
 * function that awaits its prop and returns JSX, with no Next-specific
 * server context beyond that (no `notFound()`/`redirect()`/`cookies()`
 * here), it's called directly and its resolved element is handed to RTL's
 * `render`, same as calling any other async function under test.
 *
 * `<PriceGuaranteeClaimForm>` is mocked out to a prop-inspecting stub —
 * this file's job is only the searchParams parsing/validation branch
 * (`hasValidTyreVariantId && hasValidOrderId ? <Form/> : <fallback/>` and
 * exactly which values get threaded through), not the form's own internal
 * auth/rendering states, which `claim-form.test.tsx` already covers in
 * full. Keeping the mock here means this suite doesn't need an
 * `<AuthProvider>` wrapper at all.
 */
vi.mock("@/components/price-guarantee/claim-form", () => ({
  PriceGuaranteeClaimForm: ({
    tyreVariantId,
    orderId,
    label,
  }: {
    tyreVariantId: number;
    orderId?: number | null;
    label?: string | null;
  }) => <div data-testid="claim-form">{`tyreVariantId=${tyreVariantId} orderId=${String(orderId)} label=${String(label)}`}</div>,
}));

type SearchParams = Record<string, string | string[] | undefined>;

async function renderPage(searchParams: SearchParams) {
  const element = await NewPriceGuaranteeClaimPage({ searchParams: Promise.resolve(searchParams) });
  render(element);
}

describe("NewPriceGuaranteeClaimPage — searchParams validation", () => {
  describe("renders the form for valid context", () => {
    it("a bare valid tyre_variant_id (pre-purchase, no order_id/label)", async () => {
      await renderPage({ tyre_variant_id: "5" });

      expect(screen.getByTestId("claim-form")).toHaveTextContent("tyreVariantId=5 orderId=null label=null");
    });

    it("tyre_variant_id + order_id + label all present (post-purchase claim)", async () => {
      await renderPage({ tyre_variant_id: "5", order_id: "42", label: "Bridgestone Turanza T005 205/55 R16" });

      expect(screen.getByTestId("claim-form")).toHaveTextContent(
        "tyreVariantId=5 orderId=42 label=Bridgestone Turanza T005 205/55 R16"
      );
    });

    it("takes the first element when Next hands back array-valued params", async () => {
      await renderPage({ tyre_variant_id: ["5", "6"], order_id: ["42", "43"], label: ["First", "Second"] });

      expect(screen.getByTestId("claim-form")).toHaveTextContent("tyreVariantId=5 orderId=42 label=First");
    });
  });

  describe("falls back to the 'start from a real entry point' guidance", () => {
    function expectFallback() {
      expect(screen.queryByTestId("claim-form")).not.toBeInTheDocument();
      expect(
        screen.getByText(/Start a price-match claim from a tyre's product page/)
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Shop tyres" })).toHaveAttribute("href", "/tyres");
    }

    it("tyre_variant_id missing entirely", async () => {
      await renderPage({});
      expectFallback();
    });

    it("tyre_variant_id non-numeric", async () => {
      await renderPage({ tyre_variant_id: "not-a-number" });
      expectFallback();
    });

    it("tyre_variant_id zero", async () => {
      await renderPage({ tyre_variant_id: "0" });
      expectFallback();
    });

    it("tyre_variant_id negative", async () => {
      await renderPage({ tyre_variant_id: "-5" });
      expectFallback();
    });

    it("tyre_variant_id a non-integer decimal", async () => {
      await renderPage({ tyre_variant_id: "5.5" });
      expectFallback();
    });

    it("order_id present but non-numeric, even with an otherwise-valid tyre_variant_id", async () => {
      await renderPage({ tyre_variant_id: "5", order_id: "not-a-number" });
      expectFallback();
    });

    it("order_id present but zero/non-positive, even with an otherwise-valid tyre_variant_id", async () => {
      await renderPage({ tyre_variant_id: "5", order_id: "0" });
      expectFallback();
    });
  });
});
