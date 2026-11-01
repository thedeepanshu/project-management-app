import { TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "./Button";
import { Field, Input } from "./Field";
import { Modal } from "./Modal";

// Typed confirmation ignores case and surrounding/double spaces.
const normalise = (text) => text.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Asks before something destructive. With `confirmText` (e.g. the project's
 * name), the confirm button stays disabled until the user types it.
 */
export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = "Delete", confirmText }) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // onConfirm reports its own error (toast); keep the dialog open to retry.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={title} size="sm">
      {/* Mounted only while open, so the typed text starts empty every time. */}
      <ConfirmBody busy={busy} onCancel={onClose} onConfirm={handleConfirm} confirmLabel={confirmLabel} confirmText={confirmText}>
        {children}
      </ConfirmBody>
    </Modal>
  );
}

function ConfirmBody({ busy, onCancel, onConfirm, confirmLabel, confirmText, children }) {
  const [typed, setTyped] = useState("");
  const ready = !confirmText || normalise(typed) === normalise(confirmText);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (ready && !busy) onConfirm();
      }}
    >
      <div className="flex gap-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
          <TriangleAlert className="size-5" />
        </div>
        <div className="text-sm leading-relaxed text-muted">{children}</div>
      </div>

      {confirmText && (
        <Field
          className="mt-6"
          label={
            <>
              Type <span className="rounded-md bg-ink/6 px-1.5 py-0.5 font-semibold text-ink select-all">{confirmText}</span> to confirm
            </>
          }
        >
          {(a11y) => (
            <Input
              {...a11y}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmText}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              data-autofocus
              disabled={busy}
            />
          )}
        </Field>
      )}

      <div className="mt-7 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="danger" loading={busy} disabled={!ready}>
          {confirmLabel}
        </Button>
      </div>
    </form>
  );
}
