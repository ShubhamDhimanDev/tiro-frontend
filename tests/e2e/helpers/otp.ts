import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Test-only helper for getting real OTP codes into the E2E suite.
 *
 * PREREQUISITE this whole file exists to paper over, not fix: local dev has
 * no persistent queue worker consuming the `otp-mail` queue (Redis isn't
 * wired up yet, `QUEUE_CONNECTION=database` — backend/.env) and
 * `MAIL_MAILER=log`, so a sent OTP code only becomes readable once something
 * actually drains the queue, at which point it lands in
 * `backend/storage/logs/laravel.log` as a logged raw email instead of an
 * inbox. frontend-agent's own manual testing worked around this by running
 * `php artisan queue:work --queue=otp-mail,default --stop-when-empty` by
 * hand after triggering a send, then reading the code out of the log file —
 * `drainOtpQueueAndGetCode` below is exactly that, scripted so this suite
 * doesn't need a human doing it interactively every run.
 *
 * This is NOT a substitute for the real fix (a dedicated Redis-backed
 * `otp-mail` queue with a persistent worker, and a real mail vendor per
 * docs/architecture/08-customer-auth-otp.md §11) — that's devops-agent /
 * backend-agent territory and is already tracked. Whoever runs this suite
 * next still needs: (1) the Laravel backend reachable (see global-setup.ts),
 * and (2) `php` on PATH so this helper can shell out to `artisan`.
 */

const BACKEND_DIR = path.resolve(__dirname, "../../../../backend");
const LOG_FILE = path.join(BACKEND_DIR, "storage/logs/laravel.log");

const SUBJECT_BY_PURPOSE: Record<OtpPurpose, string> = {
  registration: "Verify your email to finish registration",
  login: "Your login code",
  password_reset: "Reset your password",
};

export type OtpPurpose = "registration" | "login" | "password_reset";

/**
 * Runs the queue worker synchronously (`--stop-when-empty` makes this a
 * one-shot drain, not a long-lived process) and scrapes the most recent code
 * emailed to `email` for `purpose` out of the log-driver mail output.
 *
 * Only safe to call once the triggering request has already completed
 * (e.g. after the UI has navigated to its "enter the code" step) — the
 * `EmailOtpChallenge` row and queued mail job are both written inside the
 * same request/response cycle that produced that UI transition, so by then
 * the job is guaranteed to already be sitting in the `jobs` table.
 */
export function drainOtpQueueAndGetCode(email: string, purpose: OtpPurpose): string {
  try {
    execSync("php artisan queue:work --queue=otp-mail,default --stop-when-empty", {
      cwd: BACKEND_DIR,
      stdio: "pipe",
    });
  } catch (err) {
    throw new Error(
      `Failed to drain the otp-mail queue via \`php artisan queue:work\` in ${BACKEND_DIR}. ` +
        `Is \`php\` on PATH and is this checkout's backend/ the one wired to the running Laravel instance? ${String(err)}`
    );
  }

  let log: string;
  try {
    log = readFileSync(LOG_FILE, "utf-8");
  } catch (err) {
    throw new Error(`Couldn't read ${LOG_FILE} to scrape the OTP code: ${String(err)}`);
  }

  const marker = `To: ${email}`;
  const lastIndex = log.lastIndexOf(marker);
  if (lastIndex === -1) {
    throw new Error(
      `No mail log entry addressed "${marker}" found in ${LOG_FILE}. Either the send never happened, ` +
        `MAIL_MAILER isn't "log" in backend/.env, or the queue worker above didn't actually process a job for it.`
    );
  }

  // A generous window past the marker — the code sits a handful of lines
  // into the HTML body, well within this.
  const window = log.slice(lastIndex, lastIndex + 4000);

  const expectedSubject = SUBJECT_BY_PURPOSE[purpose];
  if (!window.includes(`Subject: ${expectedSubject}`)) {
    throw new Error(
      `Found a mail log entry for ${email} but its Subject didn't match the expected "${expectedSubject}" ` +
        `for purpose="${purpose}" — picked up the wrong entry (stale log content, or a purpose mismatch)?`
    );
  }

  const match = window.match(/letter-spacing:\s*4px;">(\d{6})</);
  if (!match) {
    throw new Error(`Found a matching mail log entry for ${email} but couldn't extract a 6-digit code from it.`);
  }
  return match[1];
}

/** Unique-per-run email so repeated suite runs never collide with a prior run's rate-limit/resend-cooldown buckets. */
export function uniqueTestEmail(label: string): string {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  return `e2e-${label}-${suffix}@example.com`;
}

/**
 * High-entropy random password. Registration/password-reset both run the
 * submitted password through Laravel's `Password::uncompromised()` (HIBP
 * k-anonymity check, a real outbound network call) — a random string this
 * long has no realistic chance of colliding with a known breached password,
 * unlike anything memorable/hand-picked.
 */
export function strongTestPassword(): string {
  return `Tt7#${randomBytes(12).toString("base64url")}`;
}
