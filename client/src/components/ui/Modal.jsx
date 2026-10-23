import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

// Built on the native <dialog>: focus trapping, Esc-to-close, inert background
// and top-layer stacking come from the browser. Children only mount while open,
// so forms inside always start fresh.
export function Modal({ open, onClose, title, description, children, size = "md" }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-2rem)] ${{ sm: "max-w-md", md: "max-w-xl", lg: "max-w-5xl" }[size]} rounded-3xl bg-surface p-0 text-ink shadow-lift ring-1 ring-line
        opacity-0 translate-y-3 scale-[0.98] transition-all transition-discrete duration-200 ease-out
        open:opacity-100 open:translate-y-0 open:scale-100
        starting:open:opacity-0 starting:open:translate-y-3 starting:open:scale-[0.98]
        backdrop:bg-black/0 backdrop:backdrop-blur-none backdrop:transition-all backdrop:transition-discrete backdrop:duration-200
        open:backdrop:bg-black/45 open:backdrop:backdrop-blur-[2px]
        starting:open:backdrop:bg-black/0`}
    >
      {open && (
        <div className="p-6 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="font-display text-xl font-bold tracking-tight">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mt-1 -mr-2 grid size-9 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-ink/5 hover:text-ink"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
