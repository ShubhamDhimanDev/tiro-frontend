import type { AuthBackend } from "./backend-client";
import type { BackendResponse, PublicCustomer } from "./types";

/**
 * In-memory dev/test stub for `/api/v1/auth/*`, kept around now that
 * backend-agent's real endpoints are live (see `backend-client.ts`) purely
 * as an opt-in (`AUTH_BACKEND=stub`) escape hatch — e.g. for isolated
 * component tests that shouldn't need a running Laravel process, or
 * clicking through the UI without Docker Compose up. Not the default
 * anymore; see `backend.ts`.
 *
 * Implements the same `AuthBackend` interface as `backend-client.ts`'s live
 * client — see `backend.ts` for the switch between them. Behavior follows
 * docs/architecture/08-customer-auth-otp.md as closely as a same-process,
 * no-persistence stub reasonably can:
 *  - registration is bundled with OTP verification and stages the password
 *    on the "challenge" until verify succeeds (§2)
 *  - login/OTP are independent, permanent methods (§3)
 *  - password-reset request/verify (§4)
 *  - `purpose`-scoped challenges (§5)
 *  - the specific status codes/response shapes in §12
 *
 * Deliberately NOT replicated (out of scope for a UI-exercising stub, and
 * genuinely backend's job, not frontend's, to get right): real persistence
 * (state resets on server restart), real password hashing, IP-based rate
 * limiting, the exact production cooldown/lockout durations (shortened
 * here for local testing convenience — production values are the ones in
 * the architecture doc, §6/§7, and are enforced by Laravel, not by this
 * stub or by anything in `frontend/`).
 */

// ---- fixed dev-only tuning (shortened vs. production values on purpose) ----
const DEV_CODE = "123456";
const RESEND_COOLDOWN_MS = 20_000;
const LOGIN_LOCKOUT_MS = 30_000;
const CODE_TTL_MS = 10 * 60_000; // matches §6 (10 minutes) — no reason to shorten this one
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_LOGIN_ATTEMPTS = 5;

type Purpose = "registration" | "login" | "password_reset";

interface StubCustomer {
  id: number;
  name: string;
  email: string;
  mobile: string | null;
  password: string | null;
  activated: boolean;
  failedLoginAttempts: number;
  loginLockedUntil: number | null;
}

interface StubChallenge {
  purpose: Purpose;
  code: string;
  pendingPassword?: string;
  expiresAt: number;
  attempts: number;
  consumed: boolean;
  lastSentAt: number;
}

// Module-level state — survives across requests within one `next dev`/`next start`
// process, resets on restart. Good enough for manual testing; not a database.
const customers = new Map<string, StubCustomer>();
const challenges = new Map<string, StubChallenge>();
let nextId = 1;

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function challengeKey(purpose: Purpose, email: string): string {
  return `${purpose}:${normalize(email)}`;
}

function publicView(customer: StubCustomer): PublicCustomer {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    mobile: customer.mobile,
  };
}

function issueToken(customer: StubCustomer): BackendResponse {
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  return {
    status: 200,
    body: {
      data: {
        token: `stub-token.${customer.id}.${Date.now()}`,
        token_type: "Bearer",
        expires_at: expiresAt,
        customer: publicView(customer),
      },
    },
  };
}

function secondsUntil(timestampMs: number): number {
  return Math.max(1, Math.ceil((timestampMs - Date.now()) / 1000));
}

function logDevCode(purpose: Purpose, email: string, code: string) {
  console.log(`[auth-stub] ${purpose} code for ${email}: ${code}`);
}

function checkResendCooldown(purpose: Purpose, email: string): BackendResponse | null {
  const existing = challenges.get(challengeKey(purpose, email));
  if (existing && Date.now() - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    return {
      status: 429,
      body: {
        message: "Please wait before requesting another code.",
        retry_after: secondsUntil(existing.lastSentAt + RESEND_COOLDOWN_MS),
      },
    };
  }
  return null;
}

function verifyChallenge(
  purpose: Purpose,
  email: string,
  code: string
): { ok: true } | { ok: false; response: BackendResponse } {
  const key = challengeKey(purpose, email);
  const challenge = challenges.get(key);

  const invalid: BackendResponse = {
    status: 422,
    body: { message: "That code is invalid or has expired.", errors: { code: ["Invalid or expired code."] } },
  };

  if (!challenge || challenge.consumed) return { ok: false, response: invalid };
  if (Date.now() > challenge.expiresAt) return { ok: false, response: invalid };
  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    return {
      ok: false,
      response: {
        status: 422,
        body: {
          message: "Too many incorrect attempts. Request a new code.",
          errors: { code: ["Too many incorrect attempts."] },
        },
      },
    };
  }
  if (challenge.code !== code) {
    challenge.attempts += 1;
    return { ok: false, response: invalid };
  }

  return { ok: true };
}

export const stubAuthBackend: AuthBackend = {
  async register(email, password) {
    const normalized = normalize(email);

    if (password.length < 8) {
      return {
        status: 422,
        body: {
          message: "The password field must be at least 8 characters.",
          errors: { password: ["The password must be at least 8 characters."] },
        },
      };
    }

    const existing = customers.get(normalized);
    if (existing?.activated) {
      return {
        status: 422,
        body: {
          message: "An account already exists for this email — log in instead.",
          errors: { email: ["An account already exists for this email."] },
        },
      };
    }

    const cooldown = checkResendCooldown("registration", normalized);
    if (cooldown) return cooldown;

    if (!existing) {
      customers.set(normalized, {
        id: nextId++,
        name: normalized.split("@")[0],
        email: normalized,
        mobile: null,
        password: null,
        activated: false,
        failedLoginAttempts: 0,
        loginLockedUntil: null,
      });
    }

    challenges.set(challengeKey("registration", normalized), {
      purpose: "registration",
      code: DEV_CODE,
      pendingPassword: password,
      expiresAt: Date.now() + CODE_TTL_MS,
      attempts: 0,
      consumed: false,
      lastSentAt: Date.now(),
    });

    logDevCode("registration", normalized, DEV_CODE);
    return { status: 200, body: { message: "We've sent a verification code to your email." } };
  },

  async registerVerify(email, code) {
    const normalized = normalize(email);
    const result = verifyChallenge("registration", normalized, code);
    if (!result.ok) return result.response;

    const challenge = challenges.get(challengeKey("registration", normalized))!;
    const customer = customers.get(normalized);
    if (!customer) {
      return {
        status: 422,
        body: { message: "That code is invalid or has expired.", errors: { code: ["Invalid or expired code."] } },
      };
    }

    customer.password = challenge.pendingPassword ?? null;
    customer.activated = true;
    challenge.consumed = true;

    return issueToken(customer);
  },

  async login(email, password) {
    const normalized = normalize(email);
    const customer = customers.get(normalized);

    if (customer?.loginLockedUntil && Date.now() < customer.loginLockedUntil) {
      return {
        status: 429,
        body: {
          message: "Too many failed attempts. Try again later.",
          retry_after: secondsUntil(customer.loginLockedUntil),
        },
      };
    }

    const invalidCredentials: BackendResponse = {
      status: 401,
      body: { message: "Invalid email or password." },
    };

    if (!customer || !customer.activated || !customer.password || customer.password !== password) {
      if (customer) {
        customer.failedLoginAttempts += 1;
        if (customer.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
          customer.loginLockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
        }
      }
      return invalidCredentials;
    }

    customer.failedLoginAttempts = 0;
    customer.loginLockedUntil = null;
    return issueToken(customer);
  },

  async otpRequest(email) {
    const normalized = normalize(email);
    const cooldown = checkResendCooldown("login", normalized);
    if (cooldown) return cooldown;

    challenges.set(challengeKey("login", normalized), {
      purpose: "login",
      code: DEV_CODE,
      expiresAt: Date.now() + CODE_TTL_MS,
      attempts: 0,
      consumed: false,
      lastSentAt: Date.now(),
    });

    logDevCode("login", normalized, DEV_CODE);
    return { status: 200, body: { message: "If an account exists for this email, a code has been sent." } };
  },

  async otpVerify(email, code) {
    const normalized = normalize(email);
    const result = verifyChallenge("login", normalized, code);
    if (!result.ok) return result.response;

    challenges.get(challengeKey("login", normalized))!.consumed = true;

    const customer = customers.get(normalized);
    if (!customer || !customer.activated) {
      return {
        status: 404,
        body: { message: "No account found for this email — register to continue." },
      };
    }

    return issueToken(customer);
  },

  async passwordResetRequest(email) {
    const normalized = normalize(email);
    const cooldown = checkResendCooldown("password_reset", normalized);
    if (cooldown) return cooldown;

    const customer = customers.get(normalized);
    // Always generic 200 — but only actually stage/"send" a code if an
    // activated account exists, per §4. Response is identical either way.
    if (customer?.activated) {
      challenges.set(challengeKey("password_reset", normalized), {
        purpose: "password_reset",
        code: DEV_CODE,
        expiresAt: Date.now() + CODE_TTL_MS,
        attempts: 0,
        consumed: false,
        lastSentAt: Date.now(),
      });
      logDevCode("password_reset", normalized, DEV_CODE);
    }

    return {
      status: 200,
      body: { message: "If an account exists for this email, a reset code has been sent." },
    };
  },

  async passwordResetVerify(email, code, newPassword) {
    const normalized = normalize(email);

    if (newPassword.length < 8) {
      return {
        status: 422,
        body: {
          message: "The password field must be at least 8 characters.",
          errors: { password: ["The password must be at least 8 characters."] },
        },
      };
    }

    const result = verifyChallenge("password_reset", normalized, code);
    if (!result.ok) return result.response;

    challenges.get(challengeKey("password_reset", normalized))!.consumed = true;

    const customer = customers.get(normalized);
    if (!customer || !customer.activated) {
      return {
        status: 422,
        body: { message: "That code is invalid or has expired.", errors: { code: ["Invalid or expired code."] } },
      };
    }

    customer.password = newPassword;
    customer.failedLoginAttempts = 0;
    customer.loginLockedUntil = null;
    return issueToken(customer);
  },

  async logoutSession(_token) {
    // No per-token store in the stub (only one fake token concept per
    // customer), so there's nothing meaningful to revoke — always succeeds.
    return { status: 204, body: null };
  },

  async logoutAllSessions(_token) {
    return { status: 204, body: null };
  },
};
