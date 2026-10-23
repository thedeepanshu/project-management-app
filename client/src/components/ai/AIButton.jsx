import { LoaderCircle, Sparkles } from "lucide-react";

/** Small gradient pill used for every "ask the AI" action. */
export function AIButton({ children, loading = false, ...props }) {
  return (
    <button
      type="button"
      {...props}
      disabled={loading || props.disabled}
      className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full bg-linear-to-r from-twill-500/12 to-thread-500/12 px-3 text-xs font-semibold text-twill-700 ring-1 ring-twill-500/25 transition ring-inset hover:from-twill-500/20 hover:to-thread-500/20 disabled:cursor-default disabled:opacity-60 dark:text-twill-200"
    >
      {loading ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
      {children}
    </button>
  );
}
