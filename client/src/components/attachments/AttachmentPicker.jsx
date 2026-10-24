import { CircleAlert, Paperclip, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ApiError } from "../../lib/api";
import { ATTACHMENT_ACCEPT, checkFileSize, discardUploads, formatBytes, uploadFile } from "../../lib/uploads";
import { FileIcon } from "./FileIcon";
import { MAX_FILES } from "./fileMeta";

function kindOf(file) {
  if (file.type === "application/pdf") return "PDF";
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type.startsWith("video/") || file.type.startsWith("audio/")) return "VIDEO";
  return "DOCUMENT";
}

function Row({ item, onRemove }) {
  const preview = item.attachment?.thumbnailUrl ?? item.previewUrl;
  const [previewFailed, setPreviewFailed] = useState(false);
  const iconFile = item.attachment ?? { kind: item.kind, name: item.name, format: null };

  return (
    <li className="flex items-center gap-3 rounded-xl bg-elevated px-2.5 py-2 ring-1 ring-line">
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink/5">
        {preview && !previewFailed ? (
          <img src={preview} alt="" className="size-full object-cover" onError={() => setPreviewFailed(true)} />
        ) : (
          <FileIcon file={iconFile} className="size-5 text-subtle" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{item.name}</p>
        {item.status === "uploading" ? (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/8">
            <div
              className="h-full rounded-full bg-linear-to-r from-twill-500 to-thread-500 transition-[width] duration-200"
              style={{ width: `${Math.round(item.progress * 100)}%` }}
            />
          </div>
        ) : item.status === "error" ? (
          <p className="text-xs text-red-600 dark:text-red-400">{item.error}</p>
        ) : (
          <p className="text-xs text-subtle">
            {formatBytes(item.bytes)}
            {item.status === "ready" && " · ready to save"}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-subtle transition hover:bg-red-500/10 hover:text-red-600"
        aria-label={item.status === "uploading" ? `Cancel ${item.name}` : `Remove ${item.name}`}
      >
        <X className="size-4" />
      </button>
    </li>
  );
}

/**
 * File field for the project form. Files upload as soon as they're picked;
 * the parent saves `ready` items with the project. Uploads that are never
 * saved (removed, or the form is closed) are deleted from storage.
 *
 * items: [{ key, status: "saved" | "uploading" | "ready" | "error", ... }]
 */
export function AttachmentPicker({ items, setItems }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const unmountedRef = useRef(false);

  // The parent form discards unsaved files when it closes; this only tracks
  // whether an upload finished after that.
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  const patch = (key, changes) => setItems((list) => list.map((item) => (item.key === key ? { ...item, ...changes } : item)));

  async function startUpload(file) {
    const key = crypto.randomUUID();
    const controller = new AbortController();
    const kind = kindOf(file);
    const previewUrl = kind === "IMAGE" ? URL.createObjectURL(file) : null;
    setItems((list) => [
      ...list,
      { key, status: "uploading", progress: 0, name: file.name, bytes: file.size, kind, previewUrl, controller },
    ]);

    try {
      const input = await uploadFile(file, "attachment", {
        onProgress: (progress) => patch(key, { progress }),
        signal: controller.signal,
      });
      // Finished after the form closed: nothing will save it, so clean it up.
      if (unmountedRef.current) return discardUploads([input]);
      patch(key, { status: "ready", input, bytes: input.bytes, controller: null });
    } catch (error) {
      if (error.name === "AbortError") return;
      patch(key, {
        status: "error",
        controller: null,
        error: error instanceof ApiError ? error.message : "Upload failed. Try again.",
      });
    }
  }

  async function handleFiles(fileList) {
    const chosen = [...fileList];
    const room = MAX_FILES - items.filter((item) => item.status !== "error").length;
    if (chosen.length > room) {
      toast.error(room > 0 ? `You can add ${room} more file${room === 1 ? "" : "s"}.` : `A project can have at most ${MAX_FILES} files.`);
      chosen.splice(Math.max(room, 0));
    }
    for (const file of chosen) {
      const sizeError = await checkFileSize(file);
      if (sizeError) toast.error(sizeError);
      else startUpload(file);
    }
  }

  function remove(item) {
    item.controller?.abort();
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    if (item.status === "ready") discardUploads([item.input]);
    setItems((list) => list.filter((other) => other.key !== item.key));
  }

  const count = items.filter((item) => item.status !== "error").length;

  return (
    <div>
      <div className="mb-1.5 flex min-h-6 items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Paperclip className="size-4 text-muted" /> Files
        </span>
        <span className="text-xs text-subtle">
          {count}/{MAX_FILES} · Optional
        </span>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 text-left transition ${
          dragging ? "border-twill-500 bg-twill-500/6" : "border-line-strong hover:border-twill-500/50 hover:bg-ink/3"
        }`}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-twill-500/10 text-twill-600 dark:text-twill-300">
          <Paperclip className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium">{dragging ? "Drop to upload" : "Add images, videos, PDFs or documents"}</span>
          <span className="block text-xs text-subtle">Drag files here or click to browse · up to 10 MB each (videos 100 MB)</span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {items.length > 0 && (
        <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto" aria-live="polite">
          {items.map((item) => (
            <Row key={item.key} item={item} onRemove={() => remove(item)} />
          ))}
        </ul>
      )}
      {items.some((item) => item.status === "error") && (
        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-red-600 dark:text-red-400">
          <CircleAlert className="size-3.5" /> Failed files won't be saved. Remove them or try uploading again.
        </p>
      )}
    </div>
  );
}
