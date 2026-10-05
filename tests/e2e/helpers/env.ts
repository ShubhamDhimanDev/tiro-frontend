import fs from "node:fs";
import path from "node:path";

/**
 * Reads a single `KEY=value` line out of `frontend/.env.local` — Next's own
 * `next dev`/`next build` processes load this file automatically, but a
 * plain Node process (Playwright's test runner) does not, and this repo has
 * no `dotenv` dependency to lean on. Used only for local-dev-only values
 * this suite genuinely needs to send (e.g. `REVALIDATE_WEBHOOK_SECRET`,
 * `app/api/revalidate/route.ts`'s shared secret) — not a general-purpose env
 * loader.
 */
const ENV_LOCAL_PATH = path.resolve(__dirname, "../../../.env.local");

export function readFrontendEnvLocal(key: string): string {
  let contents: string;
  try {
    contents = fs.readFileSync(ENV_LOCAL_PATH, "utf-8");
  } catch (err) {
    throw new Error(`readFrontendEnvLocal: couldn't read ${ENV_LOCAL_PATH} — ${String(err)}`);
  }

  const line = contents.split("\n").find((l) => l.trim().startsWith(`${key}=`));
  if (!line) {
    throw new Error(`readFrontendEnvLocal: ${key} not set in ${ENV_LOCAL_PATH}`);
  }

  return line.slice(line.indexOf("=") + 1).trim();
}
