import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import { useAppConfig } from "../../hooks/useAppConfig";
import { authClient, authErrorMessage } from "../../lib/authClient";
import { PROVIDERS } from "./providers";

/**
 * "Continue with Google / GitHub / Microsoft". Only providers the server has
 * credentials for are shown. Returns null when none are configured.
 */
export function SocialButtons({ next = "/", onError, label = "Continue with", divider }) {
  const { auth } = useAppConfig();
  const [pending, setPending] = useState(null);
  const providers = auth.providers.filter((id) => PROVIDERS[id]);
  if (providers.length === 0) return null;

  async function start(provider) {
    setPending(provider);
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: next,
      errorCallbackURL: "/sign-in?error=oauth",
    });
    // On success the browser is already navigating to the provider.
    if (error) {
      setPending(null);
      onError?.(authErrorMessage(error));
    }
  }

  return (
    <>
    <div className="space-y-2.5">
      {providers.map((id) => {
        const { label: name, Icon } = PROVIDERS[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => start(id)}
            disabled={pending !== null}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-surface text-[15px] font-medium shadow-soft ring-1 ring-line-strong transition hover:bg-elevated hover:ring-subtle/60 disabled:cursor-default disabled:opacity-60"
          >
            {pending === id ? <LoaderCircle className="size-5 animate-spin" /> : <Icon />}
            {label} {name}
          </button>
        );
      })}
    </div>
    {divider && <OrDivider>{divider}</OrDivider>}
    </>
  );
}

export function OrDivider({ children = "or" }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs font-medium tracking-wide text-subtle uppercase">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
