import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

// Built on the native <dialog>: focus trapping, Esc-to-close, inert background
// and top-layer stacking come from the browser. Children only mount while open,
// so forms inside always start fresh.
//
// Opening the dialog moves focus to its first focusable element (the close
// button), overriding React's autoFocus. Mark the field to focus with
// `data-autofocus` instead.
//
// The dialog itself never scrolls (that put the scrollbar on the rounded outer
// edge). The header stays fixed and only the body scrolls, inset from the edge;
// wrap a form's buttons in ModalFooter to keep them in view too.
// overflow-clip (not hidden) so focusing a field can't scroll the header away.
export function Modal({ open, onClose, title, description, children, size = "md" }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] ${{ sm: "max-w-md", md: "max-w-xl", lg: "max-w-5xl" }[size]} overflow-clip rounded-3xl bg-surface p-0 text-ink shadow-lift ring-1 ring-line
        opacity-0 translate-y-3 scale-[0.98] transition-all transition-discrete duration-200 ease-out
        open:opacity-100 open:translate-y-0 open:scale-100
        starting:open:opacity-0 starting:open:translate-y-3 starting:open:scale-[0.98]
        backdrop:bg-black/0 backdrop:backdrop-blur-none backdrop:transition-all backdrop:transition-discrete backdrop:duration-200
        open:backdrop:bg-black/45 open:backdrop:backdrop-blur-[2px]
        starting:open:backdrop:bg-black/0`}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
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
          </header>
          {/* Inset by mr/mb so the scrollbar stays clear of the rounded corners. */}
          {/* scroll-pb: a field reached with Tab isn't left hidden behind a ModalFooter. */}
          <div className="scroll-soft mr-1.5 mb-3 min-h-0 scroll-pb-32 overflow-y-auto pt-1 pr-4.5 pl-6 sm:pr-5.5 sm:pl-7">
            <div className="pb-3">{children}</div>
          </div>
        </div>
      )}
    </dialog>
  );
}

/**
 * A form's buttons, kept in view while its fields scroll underneath on short
 * screens. The negative margins cancel the modal body's padding, so scrolling
 * content can't show around the edges; the fade only shows over content.
 */
export function ModalFooter({ className = "", children }) {
  return (
    <div
      className={`sticky bottom-0 z-10 -mr-4.5 -mb-3 -ml-6 bg-surface pt-3 pr-4.5 pb-3 pl-6 sm:-mr-5.5 sm:-ml-7 sm:pr-5.5 sm:pl-7
        before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-5 before:bg-linear-to-t before:from-surface before:to-transparent ${className}`}
    >
      {children}
    </div>
  );
}
