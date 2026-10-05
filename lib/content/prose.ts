/**
 * Small helpers over admin-authored article HTML (trusted, see
 * `components/content/content-page-body.tsx`). Regex-based on purpose: the
 * markup comes from one rich-text editor and we only touch h2/h3 tags.
 */

export type TocEntry = { id: string; text: string; level: 2 | 3 };

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "section"
  );
}

/**
 * Gives every h2/h3 an `id` (keeping any that exist) and returns the outline.
 * Duplicate ids get a numeric suffix.
 */
export function withHeadingIds(html: string): { html: string; toc: TocEntry[] } {
  const used = new Set<string>();
  const toc: TocEntry[] = [];

  const out = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (_match, level: string, attrs: string, inner: string) => {
    const text = stripTags(inner);
    const existing = /\sid\s*=\s*["']([^"']+)["']/i.exec(attrs);
    let id = existing ? existing[1] : slugifyHeading(text);
    if (!existing) {
      const base = id;
      let n = 2;
      while (used.has(id)) id = `${base}-${n++}`;
    }
    used.add(id);
    if (text) toc.push({ id, text, level: Number(level) as 2 | 3 });
    const attrsWithId = existing ? attrs : `${attrs} id="${id}"`;
    return `<h${level}${attrsWithId}>${inner}</h${level}>`;
  });

  return { html: out, toc };
}

/** Whole minutes at ~220 wpm, minimum 1. */
export function readingMinutes(html: string): number {
  const words = stripTags(html).split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function formatArticleDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

/** True when `updated` is on a later calendar day than `published` (an edit on the publish day is not worth flagging). */
export function isUpdatedAfterPublish(published: string | null | undefined, updated: string | null | undefined): boolean {
  if (!published || !updated) return false;
  const p = new Date(published);
  const u = new Date(updated);
  if (Number.isNaN(p.getTime()) || Number.isNaN(u.getTime())) return false;
  return u.toISOString().slice(0, 10) > p.toISOString().slice(0, 10);
}

export function categoryLabel(category: string | null | undefined): string | null {
  return category ? category.replace(/-/g, " ") : null;
}
