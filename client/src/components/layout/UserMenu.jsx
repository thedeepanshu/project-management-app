import { useApolloClient } from "@apollo/client/react";
import { ChevronsUpDown, LogOut, Moon, Settings, Sun } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import { POPOVER_PANEL, usePopover } from "../../hooks/usePopover";
import { useTheme } from "../../hooks/useTheme";
import { authClient } from "../../lib/authClient";
import { photoThumb } from "../../lib/images";
import { Avatar } from "../ui/Avatar";

const ITEM =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-ink/6 focus-visible:bg-ink/6 focus-visible:outline-none";

/** Account menu: profile summary, settings, theme and sign out. */
export function UserMenu({ compact = false }) {
  const { data: session } = authClient.useSession();
  const { anchorRef, popoverRef, open, show, hide } = usePopover({ matchWidth: !compact });
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const apollo = useApolloClient();
  const [signingOut, setSigningOut] = useState(false);
  const user = session?.user;
  if (!user) return null;

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    // Nothing from this workspace may stay in memory for the next person.
    await apollo.clearStore();
    navigate("/sign-in", { replace: true });
  }

  function go(path) {
    hide();
    navigate(path);
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => (open ? hide() : show())}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={`flex cursor-pointer items-center gap-3 rounded-xl text-left transition hover:bg-ink/5 ${compact ? "p-1" : "w-full p-2"}`}
      >
        <Avatar name={user.name || user.email} src={photoThumb(user.image, 80)} size={compact ? "sm" : "md"} />
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{user.name}</span>
              <span className="block truncate text-xs text-subtle">{user.email}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-subtle" />
          </>
        )}
      </button>

      <div
        ref={popoverRef}
        popover="manual"
        role="menu"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            hide({ focusAnchor: true });
          }
        }}
        className={`${POPOVER_PANEL} w-60`}
      >
        <div className="border-b border-line px-3 pt-1.5 pb-2.5">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-subtle">{user.email}</p>
        </div>
        <div className="pt-1.5">
          <button type="button" role="menuitem" className={ITEM} onClick={() => go("/account")}>
            <Settings className="size-4 text-muted" /> Account settings
          </button>
          <button type="button" role="menuitem" className={ITEM} onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="size-4 text-muted" /> : <Moon className="size-4 text-muted" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${ITEM} text-red-600 dark:text-red-400`}
            onClick={signOut}
            disabled={signingOut}
          >
            <LogOut className="size-4" /> {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </>
  );
}
