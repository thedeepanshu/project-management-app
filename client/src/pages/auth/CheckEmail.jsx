import { MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { AuthAlert } from "../../components/auth/AuthLayout";
import { Button } from "../../components/ui/Button";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { authClient, authErrorMessage } from "../../lib/authClient";

const COOLDOWN = 60;

export default function CheckEmail() {
  useDocumentTitle("Check your email");
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const [wait, setWait] = useState(COOLDOWN);
  const [message, setMessage] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function resend() {
    setSending(true);
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/" });
    setSending(false);
    setMessage(error ? { tone: "error", text: authErrorMessage(error) } : { tone: "success", text: "A new link is on its way." });
    setWait(COOLDOWN);
  }

  return (
    <div className="text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-twill-500/10 text-twill-600 dark:text-twill-300">
        <MailCheck className="size-8" />
      </span>
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">Check your email</h1>
      <p className="mt-3 text-muted">
        We sent a verification link to {email ? <strong className="text-ink">{email}</strong> : "your inbox"}. Open it to
        finish creating your account. The link works for 24 hours.
      </p>
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
