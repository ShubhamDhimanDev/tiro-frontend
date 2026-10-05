import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/auth/next-path";

export const metadata = {
  title: "Log in | Tiro Mobile Tyres",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const { email, next } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="type-h2">Log in</h1>
        <p className="mt-2 text-muted">
          Use your password, or get a one-time code by email — your choice.
        </p>
      </div>
      <LoginForm initialEmail={email ?? ""} next={safeNextPath(next)} />
    </div>
  );
}
