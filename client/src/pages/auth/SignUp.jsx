import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { AuthAlert, AuthHeading } from "../../components/auth/AuthLayout";
import { DevSocialHint } from "../../components/auth/DevHints";
import { PasswordInput } from "../../components/auth/PasswordInput";
import { SocialButtons } from "../../components/auth/SocialButtons";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { useAppConfig } from "../../hooks/useAppConfig";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { authClient, authErrorMessage, safeNext } from "../../lib/authClient";
import { markVerificationSent } from "../../lib/resendCooldown";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateSignUp({ name, email, password }, { min, max }) {
  const errors = {};
  if (name.trim().length < 2) errors.name = "Please enter your name";
  else if (name.trim().length > 80) errors.name = "Name must be at most 80 characters";
  if (!EMAIL.test(email.trim())) errors.email = "Please enter a valid email address";
  // The part before @, if it's long enough to be guessable: "a" or "" would
  // match almost any password.
  const emailName = email.trim().split("@")[0].toLowerCase();
  if (password.length < min) errors.password = `Use at least ${min} characters`;
  else if (password.length > max) errors.password = `Use at most ${max} characters`;
  else if (emailName.length >= 4 && password.toLowerCase().includes(emailName)) {
    errors.password = "Don't include your email name in the password";
  }
  return errors;
}

export default function SignUp() {
  useDocumentTitle("Create account");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const { auth } = useAppConfig();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function set(field, value) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    if (submitted) setErrors(validateSignUp(nextValues, auth.password));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setFormError(null);
    const found = validateSignUp(values, auth.password);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    const email = values.email.trim();
    const { error } = await authClient.signUp.email({
      name: values.name.trim(),
      email,
      password: values.password,
      // Where the verification link takes them, signed in (the server adds ?verified=1).
      callbackURL: next,
    });
    setSubmitting(false);
    if (error) {
      // Password problems belong next to the password field.
      if (/password/i.test(error.code ?? "") || /password/i.test(error.message ?? "")) {
        setErrors({ password: authErrorMessage(error) });
      } else setFormError(authErrorMessage(error));
      return;
    }
    markVerificationSent(email);
    navigate(`/check-email?email=${encodeURIComponent(email)}`, { replace: true });
  }

  return (
    <>
      <AuthHeading title="Create your account">Free, private to you, and ready in a minute.</AuthHeading>
      {formError && <AuthAlert>{formError}</AuthAlert>}

      <DevSocialHint />
      <SocialButtons next={next} onError={setFormError} label="Sign up with" divider="or with email" />

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Full name" error={errors.name}>
          {(a11y) => (
            <Input {...a11y} autoComplete="name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="Ada Lovelace" autoFocus />
          )}
        </Field>
        <Field label="Email" error={errors.email}>
          {(a11y) => (
            <Input
              {...a11y}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@studio.com"
            />
          )}
        </Field>
        <Field label="Password" error={errors.password}>
          {(a11y) => (
            <PasswordInput
              {...a11y}
              autoComplete="new-password"
              value={values.password}
              onChange={(e) => set("password", e.target.value)}
              maxLength={auth.password.max}
              minLength={auth.password.min}
              showStrength
            />
          )}
        </Field>
        <Button type="submit" variant="brand" size="lg" className="w-full" loading={submitting}>
          Create account <ArrowRight />
        </Button>
        <p className="text-center text-xs leading-relaxed text-subtle">
          We'll email you a link to confirm your address. Passwords found in known data breaches aren't allowed.
        </p>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link to={`/sign-in${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-twill-600 hover:underline dark:text-twill-300">
          Sign in
        </Link>
      </p>
    </>
  );
}
