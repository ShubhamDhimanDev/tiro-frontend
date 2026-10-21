import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Palette guard (user rule 2026-10-01, amended 2026-10-05, theme changed twice on 2026-10-13): the
 * storefront uses the brand red #DA291C (the `accent` token; the logo artwork stays #FF0000),
 * deep navy #12355B (the `action` partner colour, hover #0B2545), white, black, neutral greys, a status
 * green #167A4B (`success`: in stock / success only, never a button) and ONE semantic error colour,
 * the danger token (--c-danger #b3261e, used via text-danger / border-danger / bg-danger-soft) for
 * error states only. Yellow/gold (the retired brand colour), the retired `green` button colour, raw Tailwind
 * red / rose / orange / amber / blue families, the retired alias tokens and the legacy red/blue
 * hexes must not appear in app/, components/ or lib/ sources: brand red goes through the accent
 * token, errors through the danger token, never a hard-coded Tailwind red.
 *
 * The second block pins the contrast numbers the palette was chosen for (see the comment at the
 * top of app/globals.css): nudging a token silently would break white-on-red text or red text on
 * dark surfaces. docs/color-review/PLAN.md has the reasoning.
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
  ["tailwind red/rose/orange/amber/blue-family colour class", new RegExp(String.raw`\b(?:${UTIL})-(?:red|rose|orange|amber|blue|sky|indigo|violet|purple|fuchsia|pink|cyan|teal)(?:-\d{2,3})?\b`)],
  ["retired palette token (signal/caliper/amber/teal/red)", new RegExp(String.raw`\b(?:${UTIL})-(?:signal|caliper|amber|teal|red)(?:-hover)?(?:/\d+)?\b`)],
  ["--c-signal / --color-red token", /--c-signal|--color-red\b/],
  ["legacy red hex #D62012 / #DF2020", /#d62012|#df2020/i],
  ["legacy warning hex #b45309", /#b45309/i],
  ["legacy link-blue hex #0066b3", /#0066b3/i],
  // Retired 2026-10-13: the brand accent is red now (`accent` token), not yellow/gold.
  ["yellow/gold colour class", new RegExp(String.raw`\b(?:${UTIL})-(?:gold|yellow)(?:-soft)?(?:/\d+)?\b`)],
  ["yellow/gold token or variable", /--c-gold|--color-gold|--color-yellow/],
  ["brand-yellow hex #FFCE00 / #FFF4BF / #E6B900", /#ffce00|#fff4bf|#e6b900/i],
  ["brand-yellow rgba(255, 206, 0, ...)", /rgba?\(\s*255\s*,\s*206\s*,\s*0/],
  // Pass 2 (colour review): text on a red fill is white. Black on #DA291C is only 4.3:1.
  ["black text on a red accent fill", new RegExp(String.raw`(?:^|[\s"'\u0060])bg-accent(?![-\w])[^"'\u0060]*\btext-black\b|\btext-black\b[^"'\u0060]*(?:^|[\s"'\u0060])bg-accent(?![-\w])`)],
  ["retired olive green hex #3C8425 / #2F6F1F / #3F7F27", /#3c8425|#2f6f1f|#3f7f27/i],
  // Pass 3 (partner colour): buttons and tiles are navy via `action`; green is status-only and goes through `success`.
  ["retired green colour class (use action for buttons/tiles, success for status)", new RegExp(String.raw`\b(?:${UTIL})-green(?:-hover)?\b`)],
  ["retired --c-green / --color-green token", /--c-green|--color-green\b/],
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

/** WCAG 2.x relative luminance / contrast ratio for #rrggbb. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const GLOBALS = readFileSync(path.join(ROOT, "app", "globals.css"), "utf8");
function token(name: string): string {
  const m = GLOBALS.match(new RegExp(String.raw`${name}:\s*(#[0-9a-fA-F]{6})\b`));
  if (!m) throw new Error(`${name} is not a #rrggbb custom property in app/globals.css`);
  return m[1].toLowerCase();
}

describe("palette contrast (see the comment at the top of app/globals.css)", () => {
  const accent = token("--c-accent");
  const action = token("--c-action");

  it("uses the colour review's red, not the logo's pure #FF0000", () => {
    expect(accent).toBe("#da291c");
  });

  it("keeps WHITE text on the accent fill and on its hover at AA, and hover darker than the fill", () => {
    expect(contrast("#ffffff", accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#ffffff", token("--c-accent-hover"))).toBeGreaterThanOrEqual(4.5);
    expect(luminance(token("--c-accent-hover"))).toBeLessThan(luminance(accent));
  });

  it("documents why there is no black text on the accent: it fails AA for normal text", () => {
    expect(contrast("#000000", accent)).toBeLessThan(4.5);
  });

  it("allows the accent as body text on white, and keeps black text on its wash readable", () => {
    expect(contrast(accent, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#000000", token("--c-accent-soft"))).toBeGreaterThanOrEqual(7);
  });

  it("uses accent-light for red text on dark: plain accent fails there, accent-light passes", () => {
    expect(contrast(accent, token("--c-footer"))).toBeLessThan(4.5);
    expect(contrast(token("--c-accent-light"), token("--c-footer"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("--c-accent-light"), "#000000")).toBeGreaterThanOrEqual(4.5);
  });

  it("uses the deep navy partner colour, with white text on it and on its hover at AAA", () => {
    expect(action).toBe("#12355b");
    expect(contrast("#ffffff", action)).toBeGreaterThanOrEqual(7);
    expect(contrast("#ffffff", token("--c-action-hover"))).toBeGreaterThanOrEqual(7);
    expect(luminance(token("--c-action-hover"))).toBeLessThan(luminance(action));
  });

  it("keeps the navy well apart from the red in lightness, so a navy and a red button never read as one colour", () => {
    expect(contrast(action, accent)).toBeGreaterThanOrEqual(2);
  });

  it("keeps the status green readable as text on white (it is never a fill)", () => {
    expect(contrast(token("--c-success"), "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the error red distinct in kind from the accent, on its own wash at AA", () => {
    expect(token("--c-danger")).not.toBe(accent);
    expect(contrast(token("--c-danger"), token("--c-danger-soft"))).toBeGreaterThanOrEqual(4.5);
  });
});
