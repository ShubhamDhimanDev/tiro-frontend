import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Log in | Tiro Mobile Tyres",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Log in</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Use your password, or get a one-time code by email — your choice.
        </p>
      </div>
      <LoginForm initialEmail={email ?? ""} />
    </div>
  );
}
