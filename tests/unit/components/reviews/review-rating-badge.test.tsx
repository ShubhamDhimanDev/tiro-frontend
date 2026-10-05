import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewRatingBadge } from "@/components/reviews/review-rating-badge";
import type { ReviewsSummary } from "@/lib/reviews/types";

/**
 * `<ReviewRatingBadge>` — reads `summary.average_rating`/`total_count`
 * straight off the API response per its own doc comment. The one branch
 * worth a dedicated test beyond the happy path is `total_count === 0`
 * (renders `null` rather than a broken "0.0 stars, 0 reviews" badge).
 */
describe("ReviewRatingBadge", () => {
  it("renders nothing when total_count is 0", () => {
    const summary: ReviewsSummary = { average_rating: 0, total_count: 0 };
    const { container } = render(<ReviewRatingBadge summary={summary} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the average rating (1 decimal place) and pluralized review count", () => {
    const summary: ReviewsSummary = { average_rating: 4.7, total_count: 123 };
    render(<ReviewRatingBadge summary={summary} />);

    expect(screen.getByText("4.7")).toBeInTheDocument();
    expect(screen.getByText("123 Google reviews")).toBeInTheDocument();
  });

  it("uses singular 'review' when total_count is exactly 1", () => {
    const summary: ReviewsSummary = { average_rating: 5, total_count: 1 };
    render(<ReviewRatingBadge summary={summary} />);

    expect(screen.getByText("1 Google review")).toBeInTheDocument();
    expect(screen.queryByText("1 Google reviews")).not.toBeInTheDocument();
  });

  it("formats a whole-number average rating with one decimal place (e.g. 5 -> \"5.0\")", () => {
    const summary: ReviewsSummary = { average_rating: 5, total_count: 42 };
    render(<ReviewRatingBadge summary={summary} />);

    expect(screen.getByText("5.0")).toBeInTheDocument();
  });
});
