import type { TocEntry } from "@/lib/content/prose";

/** "On this page" outline, desktop only (rendered in a sticky side column). */
export function ArticleToc({ entries }: { entries: TocEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="type-eyebrow mb-3 font-bold text-muted">On this page</p>
      <ol className="flex flex-col gap-1 border-l border-line">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className={`-ml-px block border-l-2 border-transparent py-1.5 pr-2 leading-snug text-muted hover:border-gold hover:text-ink ${
                entry.level === 3 ? "pl-7" : "pl-4"
              }`}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
