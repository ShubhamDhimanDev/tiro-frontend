/** Remembers the last standard (non-staggered) tyre-size search in this browser so the finders can prefill next time. Size numbers only, no personal data. */
const KEY = "tiro:last-size";

export type LastSize = { width: string; profile: string; rim_diameter: string };

export function readLastSize(): LastSize | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<LastSize>;
    if (v && /^\d{3}$/.test(v.width ?? "") && /^\d{2}$/.test(v.profile ?? "") && /^\d{2}$/.test(v.rim_diameter ?? "")) {
      return { width: v.width!, profile: v.profile!, rim_diameter: v.rim_diameter! };
    }
  } catch {
    // Storage blocked or corrupt: behave as if nothing was saved.
  }
  return null;
}

export function writeLastSize(size: LastSize): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(size));
  } catch {
    // Ignore: remembering the size is a convenience.
  }
}
