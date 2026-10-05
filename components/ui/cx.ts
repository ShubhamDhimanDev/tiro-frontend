/** Tiny class-name joiner for the UI primitives (no dependency needed). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
