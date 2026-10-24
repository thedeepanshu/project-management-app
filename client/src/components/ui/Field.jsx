import { ChevronDown, CircleAlert } from "lucide-react";
import { useId } from "react";

const control =
  "w-full rounded-xl bg-elevated px-3.5 text-[15px] text-ink ring-1 ring-line-strong transition placeholder:text-subtle " +
  "hover:ring-subtle/70 focus:bg-surface focus:ring-2 focus:ring-twill-500 focus:outline-none " +
  "aria-invalid:ring-red-500/70 aria-invalid:focus:ring-red-500";

// Renders a label, the control (via render prop so it gets id/aria wiring),
// an optional hint and an inline error message.
// `action` renders beside the label (e.g. a small button).
export function Field({ label, error, hint, optional = false, action, children, className = "" }) {
  const id = useId();
  const messageId = `${id}-message`;
  const describedBy = error || hint ? messageId : undefined;

  return (
    <div className={className}>
      <div className="mb-1.5 flex min-h-6 items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {action ?? (optional && <span className="text-xs font-normal text-subtle">Optional</span>)}
      </div>
      {children({ id, "aria-invalid": Boolean(error) || undefined, "aria-describedby": describedBy })}
      {error ? (
        <p id={messageId} className="mt-1.5 flex items-center gap-1.5 text-[13px] text-red-600 dark:text-red-400">
          <CircleAlert className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="mt-1.5 text-[13px] text-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function Input(props) {
  return <input className={`${control} h-11`} {...props} />;
}

export function Textarea(props) {
  return <textarea className={`${control} min-h-28 resize-y py-2.5 leading-relaxed`} {...props} />;
}

export function Select({ children, className = "", ...props }) {
  return (
    <div className={`relative ${className}`}>
      <select className={`${control} h-11 cursor-pointer appearance-none pr-10`} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-subtle" />
    </div>
  );
}
