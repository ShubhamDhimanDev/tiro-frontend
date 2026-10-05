import { PasswordResetForm } from "@/components/auth/password-reset-form";

export const metadata = {
  title: "Reset your password | Tiro Mobile Tyres",
  robots: { index: false, follow: false },
};

export default async function PasswordResetPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="type-h2">Reset your password</h1>
        <p className="mt-2 text-muted">
          We&apos;ll email you a code. Enter it along with your new password to finish.
        </p>
      </div>
      <PasswordResetForm initialEmail={email ?? ""} />
    </div>
  );
}
