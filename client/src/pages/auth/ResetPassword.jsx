import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { AuthAlert, AuthHeading } from "../../components/auth/AuthLayout";
import { PasswordInput } from "../../components/auth/PasswordInput";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { useAppConfig } from "../../hooks/useAppConfig";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { authClient, authErrorMessage } from "../../lib/authClient";

export default function ResetPassword() {
  useDocumentTitle("Choose a new password");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");
  const linkError = params.get("error");
  const { auth } = useAppConfig();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!token || linkError) {
    return (
      <>
        <AuthHeading title="This link has expired" />
        <AuthAlert>Reset links work once and expire after 30 minutes. Request a new one to continue.</AuthAlert>
        <Link to="/forgot-password" className="font-semibold text-twill-600 hover:underline dark:text-twill-300">
          Request a new link
        </Link>
      </>
    );
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError(null);
    if (password.length < auth.password.min) {
      setError(`Use at least ${auth.password.min} characters.`);
      return;
    }
    setSubmitting(true);
    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token });
    setSubmitting(false);
    if (resetError) {
      setError(authErrorMessage(resetError));
      return;
    }
    // Every session was signed out by the reset; sign in again with the new password.
    navigate("/sign-in?reset=1", { replace: true });
  }

  return (
    <>
      <AuthHeading title="Choose a new password">You'll be signed out on all devices once it's changed.</AuthHeading>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <AuthAlert>{error}</AuthAlert>}
        <Field label="New password">
          {(a11y) => (
            <PasswordInput
              {...a11y}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={auth.password.max}
              minLength={auth.password.min}
              showStrength
              autoFocus
            />
          )}
        </Field>
        <Button type="submit" variant="brand" size="lg" className="w-full" loading={submitting}>
          Update password
        </Button>
      </form>
    </>
  );
}
