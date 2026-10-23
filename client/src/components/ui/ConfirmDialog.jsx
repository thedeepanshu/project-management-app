import { TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "./Button";
import { Modal } from "./Modal";

export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = "Delete" }) {
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
      <div className="flex gap-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
          <TriangleAlert className="size-5" />
        </div>
        <div className="text-sm leading-relaxed text-muted">{children}</div>
      </div>
      <div className="mt-7 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
