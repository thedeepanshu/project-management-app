import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Input } from "../ui/Field";

// A quick, client-side estimate only. The server enforces the real rules
// (length limits and the breached-password check).
function strength(password) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length < 10) score = Math.min(score, 1);
  return [
    { label: "Too weak", bar: "bg-red-500", width: "w-1/5" },
    { label: "Weak", bar: "bg-red-500", width: "w-2/5" },
    { label: "Fair", bar: "bg-amber-500", width: "w-3/5" },
    { label: "Good", bar: "bg-emerald-500", width: "w-4/5" },
    { label: "Strong", bar: "bg-emerald-500", width: "w-full" },
    { label: "Strong", bar: "bg-emerald-500", width: "w-full" },
  ][score];
}

/** Password field with a show/hide toggle and (optionally) a strength meter. */
export function PasswordInput({ showStrength = false, minLength = 10, ...props }) {
  const [visible, setVisible] = useState(false);
  const meter = showStrength ? strength(props.value) : null;

  return (
    <div>
      <div className="relative">
        <Input {...props} type={visible ? "text" : "password"} className="pr-11" />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-subtle transition hover:bg-ink/6 hover:text-ink"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {showStrength && (
        <div className="mt-2" aria-live="polite">
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/8">
            <div className={`h-full rounded-full transition-all duration-300 ${meter ? `${meter.bar} ${meter.width}` : "w-0"}`} />
          </div>
          <p className="mt-1.5 flex justify-between text-xs text-subtle">
            <span>At least {minLength} characters. Longer is stronger.</span>
            {meter && <span className="font-medium text-muted">{meter.label}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
