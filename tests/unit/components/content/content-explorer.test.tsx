import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContentExplorer } from "@/components/content/content-explorer";
import { categoryLabel, readingMinutes, withHeadingIds } from "@/lib/content/prose";
import type { ContentPageSummary } from "@/lib/content/types";

function post(n: number, category: string | null = "tyre-care"): ContentPageSummary {
  return {
    id: n,
    type: "blog_post",
    title: `Post ${n}`,
    slug: `post-${n}`,
    excerpt: `Excerpt ${n}`,
    featured_image_path: null,
    meta_title: null,
    meta_description: null,
    category,
    published_at: "2026-09-01T00:00:00Z",
  };
}

describe("ContentExplorer", () => {
  const items = [post(1), post(2, "safety"), post(3), post(4, "safety"), post(5), post(6), post(7), post(8), post(9), post(10), post(11), post(12)];

  it("features the newest post once, and does not repeat it in the grid", () => {
    render(<ContentExplorer items={items} basePath="/blog" noun="posts" featured />);
    const links = screen.getAllByRole("link").filter((a) => a.getAttribute("href") === "/blog/post-1");
    expect(links).toHaveLength(1);
    const grid = screen.getByRole("list");
    expect(within(grid).queryByText("Post 1")).not.toBeInTheDocument();
  });

  it("filters by category chip, marks it pressed, and drops the featured card", async () => {
    const user = userEvent.setup();
    render(<ContentExplorer items={items} basePath="/blog" noun="posts" featured />);
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "safety" }));
    expect(screen.getByRole("button", { name: "safety" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Post 2")).toBeInTheDocument();
    expect(screen.getByText("Post 4")).toBeInTheDocument();
    expect(screen.queryByText("Post 3")).not.toBeInTheDocument();
    expect(screen.getByText(/2 posts in safety/)).toBeInTheDocument();
  });

  it("reveals nine at a time with Show more and hides the button when done", async () => {
    const user = userEvent.setup();
    render(<ContentExplorer items={items} basePath="/blog" noun="posts" featured />);
    // 12 items: 1 featured + 9 in the grid, 2 left
    expect(screen.getAllByRole("listitem")).toHaveLength(9);
    await user.click(screen.getByRole("button", { name: /Show more posts \(2 left\)/ }));
    expect(screen.getAllByRole("listitem")).toHaveLength(11);
    expect(screen.queryByRole("button", { name: /Show more/ })).not.toBeInTheDocument();
  });

  it("has no chip row when nothing has a category", () => {
    render(<ContentExplorer items={[post(1, null), post(2, null)]} basePath="/guides" noun="guides" />);
    expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument();
  });
});

describe("prose helpers", () => {
  it("adds unique ids to h2/h3, keeps existing ones, and returns the outline", () => {
    const { html, toc } = withHeadingIds('<h2>Choosing a size</h2><p>x</p><h3 id="keep">Sub</h3><h2>Choosing a size</h2>');
    expect(html).toContain('<h2 id="choosing-a-size">');
    expect(html).toContain('<h2 id="choosing-a-size-2">');
    expect(html).toContain('id="keep"');
    expect(toc.map((t) => t.id)).toEqual(["choosing-a-size", "keep", "choosing-a-size-2"]);
  });

  it("estimates reading time and formats categories", () => {
    expect(readingMinutes("<p>short</p>")).toBe(1);
    expect(readingMinutes(`<p>${"word ".repeat(660)}</p>`)).toBe(3);
    expect(categoryLabel("tyre-care")).toBe("tyre care");
    expect(categoryLabel(null)).toBeNull();
  });
});
