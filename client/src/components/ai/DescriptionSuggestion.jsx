import { Check, RotateCcw, Sparkles, Square, X } from "lucide-react";

import { Button } from "../ui/Button";

// Shows the AI's rewrite as it streams in. Nothing changes in the form until
// the user clicks "Use this".
export function DescriptionSuggestion({ text, streaming, error, onAccept, onRetry, onStop, onDiscard }) {
  return (
    <div className="mt-2 overflow-hidden rounded-2xl bg-linear-to-br from-twill-500/8 to-thread-500/8 ring-1 ring-twill-500/25" aria-live="polite">
      <div className="flex items-center gap-1.5 px-4 pt-3 text-xs font-semibold text-twill-700 dark:text-twill-200">
        <Sparkles className="size-3.5" />
        {error ? "AI couldn't help this time" : streaming ? "Writing…" : "Suggestion"}
      </div>
      <p className="px-4 py-2 text-[15px] leading-relaxed whitespace-pre-line">
        {error ? <span className="text-red-600 dark:text-red-400">{error}</span> : text}
        {streaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-twill-500 align-middle" />}
      </p>
      <div className="flex flex-wrap justify-end gap-2 px-3 pb-3">
        {streaming ? (
          <Button variant="secondary" size="sm" onClick={onStop}>
            <Square /> Stop
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={onDiscard}>
              <X /> Discard
            </Button>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              <RotateCcw /> Try again
            </Button>
            {!error && text && (
              <Button variant="brand" size="sm" onClick={onAccept}>
                <Check /> Use this
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
