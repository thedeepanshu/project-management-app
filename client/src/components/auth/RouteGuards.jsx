import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";

import { authClient, safeNext } from "../../lib/authClient";
import { LogoMark } from "../brand/Logo";

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true" aria-label="Loading">
      <LogoMark className="size-12 animate-pulse" />
    </div>
  );
}

/**
 * The session, plus whether it's still loading for the *first* time.
 *
 * Better Auth re-checks the session whenever the tab regains focus, and while
 * signed out it reports `isPending` again during that re-check. Treating that
 * as "loading" swapped the page for the splash screen and back, which unmounted
 * it, wiping half-typed forms. Only the very first load shows the splash;
 * later re-checks keep the current page and simply redirect if the answer changes.
 */
function useSessionGate() {
  const { data: session, isPending } = authClient.useSession();
  const [settled, setSettled] = useState(false);
  if (!isPending && !settled) setSettled(true); // remember that we've had an answer
  return { session, loading: isPending && !settled };
}

/** Pages that need a signed-in user; everyone else is sent to sign in (and back afterwards). */
export function RequireAuth({ children }) {
  const { session, loading } = useSessionGate();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?next=${next}`} replace />;
  }
  return children ?? <Outlet />;
}

/** Sign-in/up pages: already signed-in users go straight to the app. */
export function GuestOnly() {
  const { session, loading } = useSessionGate();
  const location = useLocation();
  if (loading) return <Splash />;
  if (session) {
    const params = new URLSearchParams(location.search);
    const target = new URL(safeNext(params.get("next")), window.location.origin);
    if (params.has("verified")) target.searchParams.set("verified", "1");
    return <Navigate to={target.pathname + target.search} replace />;
  }
  return <Outlet />;
}
