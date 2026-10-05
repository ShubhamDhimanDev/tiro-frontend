import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Palette guard (user rule 2026-10-01, amended 2026-10-05): the storefront uses
 * yellow #FFCE00, white, black, green #3C8425 (hover #2F6F1F), neutral greys and
 * ONE semantic error colour, the danger token (--c-danger #b3261e, used via
 * text-danger / border-danger / bg-danger-soft) for error states only. Raw
 * Tailwind red / rose / orange / amber / blue families, the retired alias tokens
 * and the legacy red/blue hexes must still not appear in app/, components/ or
 * lib/ sources: errors go through the danger token, never a hard-coded red.
 */
const ROOT = path.resolve(__dirname, "../..");
const DIRS = ["app", "components", "lib"];
const EXT = /\.(tsx?|css|svg|mdx?)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.test(name)) out.push(full);
  }
  return out;
}

const UTIL = "bg|text|border|ring|outline|fill|stroke|from|to|via|decoration|divide|accent|shadow|placeholder|caret";
const FORBIDDEN: [string, RegExp][] = [
  ["tailwind red/rose/orange/amber/blue-family colour class", new RegExp(`\b(?:${UTIL})-(?:red|rose|orange|amber|blue|sky|indigo|violet|purple|fuchsia|pink|cyan|teal)(?:-\d{2,3})?\b`)],
  ["retired palette token (signal/caliper/amber/teal/red)", new RegExp(`\b(?:${UTIL})-(?:signal|caliper|amber|teal|red)(?:-hover)?(?:/\d+)?\b`)],
  ["--c-signal / --color-red token", /--c-signal|--color-red\b/],
  ["legacy red hex #D62012 / #DF2020", /#d62012|#df2020/i],
  ["legacy warning hex #b45309", /#b45309/i],
  ["legacy link-blue hex #0066b3", /#0066b3/i],
];

describe("palette guard", () => {
  it("allows the danger token utilities (they are not a forbidden family)", () => {
    for (const cls of ["text-danger", "border-danger", "bg-danger-soft"]) {
      expect(FORBIDDEN.some(([, re]) => re.test(cls))).toBe(false);
    }
  });

  const files = DIRS.flatMap((d) => walk(path.join(ROOT, d)));

  it("scans a meaningful number of sources", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  for (const [label, re] of FORBIDDEN) {
    it(`has no ${label}`, () => {
      const hits: string[] = [];
      for (const f of files) {
        // The deprecated alias definitions in globals.css are the one allowed place.
        if (f.endsWith(path.join("app", "globals.css")) && /signal|red|amber|teal/.test(label)) continue;
        readFileSync(f, "utf8")
          .split("\n")
          .forEach((line, i) => {
            if (re.test(line)) hits.push(`${path.relative(ROOT, f)}:${i + 1}: ${line.trim().slice(0, 120)}`);
          });
      }
      expect(hits).toEqual([]);
    });
  }
});
