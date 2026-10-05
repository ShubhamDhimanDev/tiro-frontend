import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewsPagination } from "@/components/reviews/reviews-pagination";
import type { ReviewsMeta } from "@/lib/reviews/types";

/**
 * `<ReviewsPagination>` — a near-duplicate of
 * `components/catalog/pagination-controls.tsx` (per its own doc comment)
 * with one real behavioural difference worth its own unit coverage: this
 * domain's paginator shape has no `last_page` field, so `lastPage` is
 * derived here from `Math.ceil(meta.total / meta.per_page)` — an off-by-one
 * in that math would silently under/over-paginate every review listing.
 */
function makeMeta(overrides: Partial<ReviewsMeta> = {}): ReviewsMeta {
  return {
    current_page: 1,
    per_page: 10,
    total: 25,
    summary: { average_rating: 4.5, total_count: 25 },
    ...overrides,
  };
}

describe("ReviewsPagination", () => {
  it("renders nothing when everything fits on one page (total <= per_page)", () => {
    const meta = makeMeta({ current_page: 1, per_page: 10, total: 7 });
    const { container } = render(<ReviewsPagination meta={meta} buildHref={(p) => `/reviews?page=${p}`} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when total exactly equals per_page (still one page)", () => {
    const meta = makeMeta({ current_page: 1, per_page: 10, total: 10 });
    const { container } = render(<ReviewsPagination meta={meta} buildHref={(p) => `/reviews?page=${p}`} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("on page 1 of multiple pages, shows Next but not Previous", () => {
    const meta = makeMeta({ current_page: 1, per_page: 10, total: 25 }); // 3 pages
    render(<ReviewsPagination meta={meta} buildHref={(p) => `/reviews?page=${p}`} />);

    expect(screen.queryByRole("link", { name: "Previous" })).not.toBeInTheDocument();
    const next = screen.getByRole("link", { name: "Next" });
    expect(next).toHaveAttribute("href", "/reviews?page=2");
    expect(screen.getByText("1", { selector: '[aria-current="page"]' })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Page 3" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Page 4" })).not.toBeInTheDocument();
  });

  it("on a middle page, shows both Previous and Next with correct hrefs", () => {
    const meta = makeMeta({ current_page: 2, per_page: 10, total: 25 }); // 3 pages
    render(<ReviewsPagination meta={meta} buildHref={(p) => `/reviews?page=${p}`} />);

    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute("href", "/reviews?page=1");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/reviews?page=3");
    expect(screen.getByText("2", { selector: '[aria-current="page"]' })).toBeInTheDocument();
  });

  it("on the last page, shows Previous but not Next", () => {
    const meta = makeMeta({ current_page: 3, per_page: 10, total: 25 }); // 3 pages
    render(<ReviewsPagination meta={meta} buildHref={(p) => `/reviews?page=${p}`} />);

    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute("href", "/reviews?page=2");
    expect(screen.queryByRole("link", { name: "Next" })).not.toBeInTheDocument();
  });

  it("rounds up a partial final page correctly (26 total / 10 per_page = 3 pages, not 2)", () => {
    const meta = makeMeta({ current_page: 1, per_page: 10, total: 26 });
    render(<ReviewsPagination meta={meta} buildHref={(p) => `/reviews?page=${p}`} />);
    // Numbered pager: pages 1..3 exist, page 4 does not.
    expect(screen.getByRole("link", { name: "Page 3" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Page 4" })).not.toBeInTheDocument();
  });
});
