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

/** Pages that need a signed-in user; everyone else is sent to sign in (and back afterwards). */
export function RequireAuth({ children }) {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();
  if (isPending) return <Splash />;
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?next=${next}`} replace />;
  }
  return children ?? <Outlet />;
}

/** Sign-in/up pages: already signed-in users go straight to the app. */
export function GuestOnly() {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();
  if (isPending) return <Splash />;
  if (session) {
    const params = new URLSearchParams(location.search);
    const target = new URL(safeNext(params.get("next")), window.location.origin);
    if (params.has("verified")) target.searchParams.set("verified", "1");
    return <Navigate to={target.pathname + target.search} replace />;
  }
  return <Outlet />;
}
