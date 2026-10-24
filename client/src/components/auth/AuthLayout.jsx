import { CheckCircle2, Moon, Sun } from "lucide-react";
import { Link, Outlet } from "react-router";
import { Toaster } from "sonner";

import { useTheme } from "../../hooks/useTheme";
import { Logo, LogoMark } from "../brand/Logo";

const POINTS = [
  "Every client and project on one calm board",
  "Drag work from not started to done",
  "Files, deadlines and priorities in one place",
];

function ThemeButton() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="grid size-9 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-ink/6 hover:text-ink"
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

/** Split layout for sign-in, sign-up and password screens. */
export function AuthLayout() {
  const { theme } = useTheme();
  return (
    <>
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-twill-600 via-twill-700 to-twill-900 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,rgb(255_255_255/0.07)_0_1px,transparent_1px_12px)]" />
        <div className="absolute -right-24 -bottom-24 size-96 rounded-full bg-thread-500/30 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-3" aria-label="Twillboard">
          <LogoMark className="size-10 ring-1 ring-white/20 rounded-[11px]" />
          <span className="font-display text-2xl font-bold tracking-tight">Twillboard</span>
        </Link>
        <div className="relative mt-auto max-w-md">
          <h2 className="font-display text-4xl leading-tight font-bold tracking-tight">
            Clients and projects, woven into one board.
          </h2>
          <ul className="mt-8 space-y-3">
            {POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3 text-white/85">
                <CheckCircle2 className="size-5 shrink-0 text-thread-300" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-16 text-sm text-white/60">Your data is private to your account.</p>
      </aside>

      {/* Form side */}
      <main className="relative flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:invisible" aria-label="Twillboard">
            <Logo />
          </Link>
          <ThemeButton />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <Outlet />
        </div>
        <p className="text-center text-xs text-subtle">
          Protected by rate limiting and encrypted sessions.
        </p>
      </main>
    </div>
    {/* Outside the grid: as a grid item it would add a row and shorten the panels. */}
    <Toaster theme={theme} position="top-center" richColors closeButton />
    </>
  );
}

export function AuthHeading({ title, children }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      {children && <p className="mt-2 text-muted">{children}</p>}
    </div>
  );
}

/** Inline alert for form-level messages. */
export function AuthAlert({ tone = "error", children }) {
  const tones = {
    error: "bg-red-500/8 text-red-700 ring-red-500/20 dark:text-red-300",
    success: "bg-emerald-500/10 text-emerald-800 ring-emerald-500/25 dark:text-emerald-300",
    info: "bg-twill-500/8 text-twill-800 ring-twill-500/20 dark:text-twill-200",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`mb-5 rounded-xl px-4 py-3 text-sm ring-1 ${tones[tone]}`}>
      {children}
    </div>
  );
}
