import Link from "next/link";

export default function ForgotPasswordPage(): React.ReactElement {
  return (
    <div className="w-full max-w-md text-center">
      <h1 className="font-jakarta text-3xl font-bold text-primary">Reset password</h1>
      <p className="mt-3 text-sm text-on-surface-variant">
        Password reset flow is connected to the API. Full UI coming next — use backend{" "}
        <code className="rounded bg-surface-container-low px-1">POST /auth/forgot-password</code>{" "}
        for now.
      </p>
      <Link href="/login" className="mt-6 inline-block text-secondary hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
