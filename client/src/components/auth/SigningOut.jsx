import { useEffect, useRef } from "react";

import { LogoMark } from "../brand/Logo";

/** Blocking "Signing out…" dialog shown while the session is being ended. */
export function SigningOut({ open }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Signing out"
      // Esc must not dismiss it: there's nothing to go back to mid sign-out.
      onCancel={(e) => e.preventDefault()}
      className="m-auto w-[calc(100%-2rem)] max-w-xs rounded-3xl bg-surface p-0 text-ink shadow-lift ring-1 ring-line
        opacity-0 scale-[0.97] transition-all transition-discrete duration-200 ease-out
        open:opacity-100 open:scale-100 starting:open:opacity-0 starting:open:scale-[0.97]
        backdrop:bg-black/0 backdrop:transition-all backdrop:transition-discrete backdrop:duration-200
        open:backdrop:bg-black/45 open:backdrop:backdrop-blur-[2px] starting:open:backdrop:bg-black/0"
    >
      {open && (
        <div className="flex flex-col items-center px-8 py-9 text-center" role="status">
          <LogoMark className="size-11 animate-pulse" />
          <p className="mt-5 font-display text-lg font-bold tracking-tight">Signing out…</p>
          <p className="mt-1 text-sm text-muted">Clearing your workspace from this device.</p>
        </div>
      )}
    </dialog>
  );
}
