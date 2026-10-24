import { MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { AuthAlert } from "../../components/auth/AuthLayout";
import { DevEmailHint } from "../../components/auth/DevHints";
import { Button } from "../../components/ui/Button";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { authClient, authErrorMessage } from "../../lib/authClient";
import { markVerificationSent, secondsUntilResend } from "../../lib/resendCooldown";

export default function CheckEmail() {
  useDocumentTitle("Check your email");
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  // Derived from when the last link was sent, not from when this page loaded.
  const [wait, setWait] = useState(() => (email ? secondsUntilResend(email) : 0));
  const [message, setMessage] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!email) return undefined;
    // Recompute from the clock each tick, so throttled background tabs stay accurate.
    const timer = setInterval(() => setWait(secondsUntilResend(email)), 1000);
    return () => clearInterval(timer);
  }, [email]);

  async function resend() {
    setSending(true);
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/" });
    setSending(false);
    if (error) {
      setMessage({ tone: "error", text: authErrorMessage(error) });
      return;
    }
    markVerificationSent(email);
    setWait(secondsUntilResend(email));
    setMessage({ tone: "success", text: "A new link is on its way." });
  }

  return (
    <div className="text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-twill-500/10 text-twill-600 dark:text-twill-300">
        <MailCheck className="size-8" />
      </span>
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">Check your email</h1>
      <p className="mt-3 text-muted">
        We sent a verification link to {email ? <strong className="text-ink">{email}</strong> : "your inbox"}. Open it to
        finish creating your account. The link works for 24 hours. Can't find it? Check your spam folder.
      </p>
      <DevEmailHint />
      <div className="mt-8 text-left">{message && <AuthAlert tone={message.tone}>{message.text}</AuthAlert>}</div>
      {email && (
        <Button variant="secondary" className="w-full" onClick={resend} loading={sending} disabled={wait > 0}>
          {wait > 0 ? `Resend link in ${wait}s` : "Resend verification email"}
        </Button>
      )}
      <p className="mt-6 text-sm text-muted">
        Wrong address?{" "}
        <Link to="/sign-up" className="font-semibold text-twill-600 hover:underline dark:text-twill-300">
          Start over
        </Link>{" "}
        ·{" "}
        <Link to="/sign-in" className="font-semibold text-twill-600 hover:underline dark:text-twill-300">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
