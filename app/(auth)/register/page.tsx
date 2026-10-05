import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Create an account | Tiro Mobile Tyres",
  robots: { index: false, follow: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="type-h2">Create an account</h1>
        <p className="mt-2 text-muted">
          Set a password, then verify your email with a code we send you. If you&apos;ve checked out as a guest
          before, this also unlocks your past order history.
        </p>
      </div>
      <RegisterForm initialEmail={email ?? ""} />
    </div>
  );
}
