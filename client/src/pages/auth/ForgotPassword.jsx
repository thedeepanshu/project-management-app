import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { AuthAlert, AuthHeading } from "../../components/auth/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { authClient, authErrorMessage } from "../../lib/authClient";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ForgotPassword() {
  useDocumentTitle("Reset password");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError(null);
    if (!EMAIL.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    const { error: requestError } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: "/reset-password",
    });
    setSubmitting(false);
    if (requestError) setError(authErrorMessage(requestError));
    else setSent(true);
  }

  return (
    <>
      <AuthHeading title="Forgot your password?">Enter your email and we'll send you a link to choose a new one.</AuthHeading>

      {sent ? (
        // Same message whether or not the account exists (no account enumeration).
        <AuthAlert tone="success">
          If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. It expires in 30 minutes.
        </AuthAlert>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {error && <AuthAlert>{error}</AuthAlert>}
          <Field label="Email">
            {(a11y) => (
              <Input
                {...a11y}
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
                autoFocus
              />
            )}
          </Field>
          <Button type="submit" variant="brand" size="lg" className="w-full" loading={submitting}>
            Send reset link
          </Button>
        </form>
      )}

      <Link to="/sign-in" className="mt-8 flex items-center justify-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
    </>
  );
}
