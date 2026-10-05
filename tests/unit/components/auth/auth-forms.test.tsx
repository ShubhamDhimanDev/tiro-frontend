import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { PasswordResetForm } from "@/components/auth/password-reset-form";
import { authApi } from "@/lib/auth/client-api";
import { authErrorMessage } from "@/lib/auth/error-copy";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/auth/auth-provider", () => ({ useAuth: () => ({ setCustomer: vi.fn() }) }));
vi.mock("@/lib/auth/client-api", () => ({
  authApi: {
    login: vi.fn(),
    otpRequest: vi.fn(),
    otpVerify: vi.fn(),
    register: vi.fn(),
    registerVerify: vi.fn(),
    passwordResetRequest: vi.fn(),
    passwordResetVerify: vi.fn(),
  },
}));

beforeEach(() => vi.clearAllMocks());

describe("login form fields", () => {
  it("uses the right autocomplete tokens and 16px+ controls (text-base)", () => {
    render(<LoginForm />);
    const email = screen.getByLabelText("Email");
    const password = screen.getByLabelText("Password");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autocomplete", "username");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(password).toHaveAttribute("type", "password");
    expect(email.className).toContain("text-base");
    expect(email.className).toContain("min-h-12");
  });

  it("toggles password visibility with a labelled, pressed-state button", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps Password and Email code as two equal toggle buttons", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: /^Password$/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Email code" }));
    expect(screen.getByRole("button", { name: "Email code" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows one generic, actionable alert for wrong credentials", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockResolvedValue({ kind: "invalid_credentials", status: 401, message: "Invalid email or password." });
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "a@b.co");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: /^Log in$/ }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/don't match/i);
    expect(alert).toHaveTextContent(/reset your password/i);
  });

  it("counts down after a rate-limit response and disables the submit", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockResolvedValue({ kind: "rate_limited", status: 429, message: "x", retryAfter: 30 });
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "a@b.co");
    await user.type(screen.getByLabelText("Password"), "pw123456");
    await user.click(screen.getByRole("button", { name: /^Log in$/ }));
    expect(await screen.findByRole("button", { name: "Try again in 30s" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/too many attempts/i);
  });
});

describe("OTP step", () => {
  it("is numeric, one-time-code, digits only, and offers a resend countdown", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.otpRequest).mockResolvedValue({ kind: "success", status: 200, data: { message: "Sent." } });
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: "Email code" }));
    await user.type(screen.getByLabelText("Email"), "a@b.co");
    await user.click(screen.getByRole("button", { name: "Send code" }));

    const code = await screen.findByLabelText("Verification code");
    expect(code).toHaveAttribute("inputmode", "numeric");
    expect(code).toHaveAttribute("autocomplete", "one-time-code");
    expect(code).toHaveAttribute("maxlength", "6");
    await user.type(code, "12a3-456789");
    expect(code).toHaveValue("123456");
    expect(screen.getByRole("button", { name: "Resend code in 60s" })).toBeDisabled();
  });
});

describe("register and reset fields", () => {
  it("register: email, new-password with hint, toggle", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    const pw = screen.getByLabelText("Password");
    expect(pw).toHaveAttribute("autocomplete", "new-password");
    expect(pw).toHaveAttribute("minlength", "8");
    expect(screen.getByText("At least 8 characters.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument();
  });

  it("register surfaces the server's specific validation message", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.register).mockResolvedValue({
      kind: "validation_error",
      status: 422,
      message: "An account already exists for this email. Log in instead.",
      errors: { email: ["An account already exists for this email."] },
    });
    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Email"), "a@b.co");
    await user.type(screen.getByLabelText("Password"), "longenough1");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect((await screen.findAllByText(/already exists for this email/i)).length).toBeGreaterThan(0);
  });

  it("reset: request step then code + new-password step", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.passwordResetRequest).mockResolvedValue({ kind: "success", status: 200, data: { message: "If an account exists we sent a code." } });
    render(<PasswordResetForm />);
    await user.type(screen.getByLabelText("Email"), "a@b.co");
    await user.click(screen.getByRole("button", { name: "Send reset code" }));
    expect(await screen.findByLabelText("Verification code")).toHaveAttribute("autocomplete", "one-time-code");
    expect(screen.getByLabelText("New password")).toHaveAttribute("autocomplete", "new-password");
  });
});

describe("authErrorMessage", () => {
  it("explains what happened and what to do", () => {
    expect(authErrorMessage({ kind: "unknown_error", status: 0, message: "" })).toMatch(/check your connection/i);
    expect(authErrorMessage({ kind: "unknown_error", status: 500, message: "" })).toMatch(/try again/i);
    expect(authErrorMessage({ kind: "validation_error", message: "Please check the form and try again." })).toMatch(/highlighted fields/i);
    expect(authErrorMessage({ kind: "validation_error", message: "The code is wrong." })).toBe("The code is wrong.");
  });
});
