import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewCard } from "@/components/reviews/review-card";
import { FIXTURE_REVIEWS } from "@/lib/reviews/fixtures";
import type { Review } from "@/lib/reviews/types";

/**
 * `<ReviewCard>` — dedicated regression coverage for the nullability bug
 * fixed in the "Reviews follow-up fix-pass (2026-09-26)" (frontend/CLAUDE.md):
 * `body`/`review_url` are genuinely nullable per the real `Review` schema,
 * and `review_url` in particular is `null` on essentially every real synced
 * row (Google's API doesn't return a `reviewUrl` field). Before the fix, the
 * "View on Google" `<a href={review.review_url}>` rendered completely
 * unconditionally — a dead `<a href="">` link on every real review card.
 *
 * Reuses `lib/reviews/fixtures.ts`'s own documented null-case rows (ids 37
 * and 20) rather than inventing new fixture data, per that file's own doc
 * comment explaining exactly what each models. The one combination not
 * already present in the fixture file (`body: null` + `review_url` set) is
 * built locally from the same shape as the happy-path fixture (id 41),
 * overriding only the one field under test.
 */

function findFixture(id: number): Review {
  const review = FIXTURE_REVIEWS.find((r) => r.id === id);
  if (!review) throw new Error(`Expected fixture review id=${id} to exist in lib/reviews/fixtures.ts`);
  return review;
}

describe("ReviewCard", () => {
  it("id 20 — body: null and review_url: null — renders no anchor and no empty body paragraph", () => {
    const review = findFixture(20);
    expect(review.body).toBeNull();
    expect(review.review_url).toBeNull();

    const { container } = render(<ReviewCard review={review} />);

    // No "View on Google" link at all.
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText("View on Google")).not.toBeInTheDocument();

    // No empty/dangling <p> rendered in place of the (absent) body — every
    // <p> element that does exist must have real text content.
    const paragraphs = container.querySelectorAll("p");
    paragraphs.forEach((p) => {
      expect(p.textContent?.trim()).not.toBe("");
    });

    // reply_body is also null on this fixture row — no reply block either.
    expect(screen.queryByText("Response from Tiro Mobile Tyres")).not.toBeInTheDocument();

    // The card itself still renders (author name, rating), not a broken shell.
    expect(screen.getByText(review.author_name)).toBeInTheDocument();
  });

  it("id 37 — body present, review_url: null — renders the body text, no link", () => {
    const review = findFixture(37);
    expect(review.body).not.toBeNull();
    expect(review.review_url).toBeNull();

    render(<ReviewCard review={review} />);

    expect(screen.getByText(review.body!)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText("View on Google")).not.toBeInTheDocument();
  });

  it("body: null, review_url present — renders the link, no body paragraph", () => {
    // Not a combination already present in fixtures.ts (which only models
    // "both null" and "url null" explicitly) — built from the happy-path
    // fixture's own shape (id 41), overriding only `body`.
    const base = findFixture(41);
    const review: Review = { ...base, body: null };

    const { container } = render(<ReviewCard review={review} />);

    const link = screen.getByRole("link", { name: "View on Google" });
    expect(link).toHaveAttribute("href", review.review_url);

    // No paragraph rendered for the (absent) body text.
    const paragraphs = Array.from(container.querySelectorAll("p")).filter(
      (p) => !p.textContent?.includes("Response from")
    );
    paragraphs.forEach((p) => {
      expect(p.textContent?.trim()).not.toBe("");
    });
    expect(screen.queryByText(base.body!)).not.toBeInTheDocument();
  });

  it("both body and review_url present — happy path renders both", () => {
    const review = findFixture(41);
    expect(review.body).not.toBeNull();
    expect(review.review_url).not.toBeNull();

    render(<ReviewCard review={review} />);

    expect(screen.getByText(review.body!)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "View on Google" });
    expect(link).toHaveAttribute("href", review.review_url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");
  });

  it("renders the business's reply when reply_body is present", () => {
    const review = findFixture(41);
    expect(review.reply_body).not.toBeNull();

    render(<ReviewCard review={review} />);

    expect(screen.getByText("Response from Tiro Mobile Tyres")).toBeInTheDocument();
    expect(screen.getByText(review.reply_body!)).toBeInTheDocument();
  });

  it("renders no reply block when reply_body is null", () => {
    const review = findFixture(40);
    expect(review.reply_body).toBeNull();

    render(<ReviewCard review={review} />);

    expect(screen.queryByText("Response from Tiro Mobile Tyres")).not.toBeInTheDocument();
  });
});
