import { useApolloClient } from "@apollo/client/react";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { AuthAlert, AuthHeading } from "../../components/auth/AuthLayout";
import { DevSocialHint } from "../../components/auth/DevHints";
import { PasswordInput } from "../../components/auth/PasswordInput";
import { SocialButtons } from "../../components/auth/SocialButtons";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { authClient, authErrorMessage, safeNext } from "../../lib/authClient";

const OAUTH_ERRORS = {
  oauth: "Sign-in with that provider didn't complete. Please try again.",
  account_not_linked:
    "That email already has an account. Sign in the way you did before, then link this provider in Account settings.",
};

export default function SignIn() {
  useDocumentTitle("Sign in");
  const navigate = useNavigate();
  const apollo = useApolloClient();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(() => OAUTH_ERRORS[params.get("error")] ?? (params.get("error") ? OAUTH_ERRORS.oauth : null));
  const [unverified, setUnverified] = useState(false);

  const notice = params.has("expired")
    ? "Your session ended. Please sign in again."
    : params.has("reset")
      ? "Password updated. Sign in with your new password."
      : params.has("deleted")
        ? "Your account and all its data were deleted."
        : params.has("signedout")
          ? "You’ve signed out. See you soon."
          : null;

  async function onSubmit(event) {
    event.preventDefault();
    setError(null);
    setUnverified(false);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    // No callbackURL: with one, the auth client navigates there itself after
    // signing in. We redirect to `next` ourselves instead.
    const { error: signInError } = await authClient.signIn.email({ email: email.trim(), password });
    setSubmitting(false);
    if (signInError) {
      if (signInError.code === "EMAIL_NOT_VERIFIED") setUnverified(true);
      else setError(authErrorMessage(signInError));
      return;
    }
    // A different user may have been signed in before: drop any cached data.
    await apollo.clearStore();
    navigate(next, { replace: true });
  }

  return (
    <>
      <AuthHeading title="Welcome back">Sign in to your Twillboard workspace.</AuthHeading>

      {notice && <AuthAlert tone="info">{notice}</AuthAlert>}
      {error && <AuthAlert>{error}</AuthAlert>}
      {unverified && (
        <AuthAlert tone="info">
          Your email isn't verified yet. We've sent a new verification link to <strong>{email.trim()}</strong>.
        </AuthAlert>
      )}

      <DevSocialHint />
      <SocialButtons next={next} onError={setError} divider="or with email" />

      <form onSubmit={onSubmit} noValidate className="space-y-4">
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
        <Field
          label="Password"
          action={
            <Link to="/forgot-password" className="text-sm font-medium text-twill-600 hover:underline dark:text-twill-300">
              Forgot password?
            </Link>
          }
        >
          {(a11y) => (
            <PasswordInput
              {...a11y}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" variant="brand" size="lg" className="w-full" loading={submitting}>
          Sign in <ArrowRight />
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        New to Twillboard?{" "}
        <Link to={`/sign-up${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-twill-600 hover:underline dark:text-twill-300">
          Create an account
        </Link>
      </p>
    </>
  );
}
