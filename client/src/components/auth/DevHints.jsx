import { Terminal } from "lucide-react";

import { useAppConfig } from "../../hooks/useAppConfig";

// Development-only setup hints. The server only sends `dev` outside
// production, so none of this can ever appear on the live site.

export function DevEmailHint() {
  const { dev } = useAppConfig();
  if (!dev?.emailToConsole) return null;
  return (
    <div className="mt-6 flex gap-3 rounded-xl bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-900 ring-1 ring-amber-500/25 dark:text-amber-200">
      <Terminal className="mt-0.5 size-4 shrink-0" />
      <p>
        <strong>Development mode:</strong> email sending isn't set up, so this email wasn't sent. Its link is printed in
        the terminal running <code className="font-mono text-xs">npm run dev</code>. Add <code className="font-mono text-xs">SMTP_USER</code> and{" "}
        <code className="font-mono text-xs">SMTP_PASS</code> to <code className="font-mono text-xs">.env</code> to send real emails.
      </p>
    </div>
  );
}

export function DevSocialHint() {
  const { dev, auth } = useAppConfig();
  if (!dev || auth.providers.length > 0) return null;
  return (
    <p className="mb-6 rounded-xl bg-ink/4 px-4 py-3 text-xs leading-relaxed text-muted ring-1 ring-line">
      <strong className="text-ink">Development:</strong> Google, GitHub and Microsoft buttons appear here once their client ID and
      secret are in <code className="font-mono">.env</code> (see the README).
    </p>
  );
}
