import { FolderKanban, LayoutDashboard, Plus, Users } from "lucide-react";
import { useEffect } from "react";
import { NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from "react-router";
import { toast, Toaster } from "sonner";

import { useWorkspace } from "../../context/workspace";
import { useTheme } from "../../hooks/useTheme";
import { Logo } from "../brand/Logo";
import { Button } from "../ui/Button";
import { UserMenu } from "./UserMenu";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/clients", label: "Clients", icon: Users },
];

function Kbd({ children }) {
  return (
    <kbd className="rounded-md bg-ink/6 px-1.5 py-0.5 font-mono text-[11px] text-muted ring-1 ring-line">{children}</kbd>
  );
}

function Sidebar() {
  const { newProject } = useWorkspace();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface/70 backdrop-blur-xl lg:flex">
      <div className="bg-twill relative px-6 pt-6 pb-5 [mask-image:linear-gradient(black_60%,transparent)]">
        <NavLink to="/" aria-label="Twillboard home">
          <Logo />
        </NavLink>
      </div>

      <div className="px-4">
        <Button variant="brand" className="w-full justify-between" onClick={() => newProject()}>
          <span className="flex items-center gap-2">
            <Plus /> New project
          </span>
          <kbd className="rounded-md bg-white/15 px-1.5 py-0.5 font-mono text-[11px]">N</kbd>
        </Button>
      </div>

      <nav className="mt-6 flex-1 space-y-1 px-3" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
                isActive ? "bg-ink/6 text-ink" : "text-muted hover:bg-ink/4 hover:text-ink"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`size-[18px] ${isActive ? "text-twill-600 dark:text-twill-300" : ""}`} />
                {label}
                {isActive && <span className="ml-auto h-4 w-1 rounded-full bg-linear-to-b from-twill-500 to-thread-500" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-line px-3 py-4">
        <p className="flex items-center gap-2 px-3 text-xs text-subtle">
          <Kbd>N</Kbd> project <Kbd>C</Kbd> client
        </p>
        <UserMenu />
      </div>
    </aside>
  );
}

function MobileBar() {
  const { newProject } = useWorkspace();
  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-canvas/80 px-4 backdrop-blur-xl lg:hidden">
        <NavLink to="/" aria-label="Twillboard home">
          <Logo />
        </NavLink>
        <div className="flex items-center gap-1.5">
          <Button variant="brand" size="icon" onClick={() => newProject()} aria-label="New project">
            <Plus />
          </Button>
          <UserMenu compact />
        </div>
      </header>

      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-3 rounded-2xl bg-surface/90 p-1.5 shadow-lift ring-1 ring-line backdrop-blur-xl lg:hidden"
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium transition ${
                isActive ? "bg-ink/6 text-ink" : "text-muted"
              }`
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export function AppLayout() {
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Arriving from the email-verification link (on whichever page they land).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has("verified")) return;
    // Fixed id: effects can run twice (React StrictMode in development), and
    // sonner shows a toast with the same id only once.
    toast.success("Email verified. Welcome to Twillboard!", { id: "email-verified" });
    params.delete("verified");
    const search = params.toString();
    navigate(location.pathname + (search ? `?${search}` : ""), { replace: true });
  }, [location, navigate]);
  return (
    <>
      <Sidebar />
      <MobileBar />
      <main className="pb-28 lg:pb-12 lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          <Outlet />
        </div>
      </main>
      <ScrollRestoration />
      <Toaster theme={theme} position="top-center" richColors closeButton />
    </>
  );
}
