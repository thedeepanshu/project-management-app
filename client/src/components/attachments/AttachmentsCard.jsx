import { useMutation } from "@apollo/client/react";
import { CircleAlert, Paperclip, Play, RotateCw, Trash2, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ADD_ATTACHMENTS, REMOVE_ATTACHMENT } from "../../graphql/documents";
import { useAppConfig } from "../../hooks/useAppConfig";
import { ApiError } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { ATTACHMENT_ACCEPT, checkFileSize, discardUploads, formatBytes, uploadFile } from "../../lib/uploads";
import { parseApolloError } from "../../lib/validation";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Card } from "../ui/States";
import { AttachmentViewer } from "./AttachmentViewer";
import { FileIcon } from "./FileIcon";

const MAX_FILES = 20;

function Tile({ file, onOpen, onRemove }) {
  const [thumbFailed, setThumbFailed] = useState(false);
  return (
    <li className="group relative overflow-hidden rounded-2xl bg-elevated ring-1 ring-line transition hover:ring-line-strong">
      <button type="button" onClick={onOpen} className="block w-full cursor-pointer text-left" title={`Open ${file.name}`}>
        <div className="relative aspect-[3/2] bg-ink/5">
          {file.thumbnailUrl && !thumbFailed ? (
            <img
              src={file.thumbnailUrl}
              alt=""
              loading="lazy"
              onError={() => setThumbFailed(true)}
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center">
              <FileIcon file={file} className="size-10 text-subtle" />
            </div>
          )}
          {file.kind === "VIDEO" && (
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-11 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm">
                <Play className="size-5 translate-x-px" fill="currentColor" />
              </span>
            </span>
          )}
          {file.kind === "PDF" && (
            <span className="absolute bottom-2 left-2 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              PDF
            </span>
          )}
        </div>
        <div className="px-3 py-2.5">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-subtle">
            {formatBytes(file.bytes)} · {formatDate(file.createdAt, { short: true })}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 grid size-8 cursor-pointer place-items-center rounded-lg bg-surface/90 text-muted opacity-100 shadow-soft ring-1 ring-line transition hover:text-red-600 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
        aria-label={`Remove ${file.name}`}
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

function UploadRow({ upload, onCancel, onRetry }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-elevated px-3 py-2.5 ring-1 ring-line">
      <UploadCloud className={`size-4 shrink-0 ${upload.error ? "text-red-500" : "text-twill-500"}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{upload.name}</p>
        {upload.error ? (
          <p className="text-xs text-red-600 dark:text-red-400">{upload.error}</p>
        ) : (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/8">
            <div
              className="h-full rounded-full bg-linear-to-r from-twill-500 to-thread-500 transition-[width] duration-200"
              style={{ width: `${Math.round(upload.progress * 100)}%` }}
            />
          </div>
        )}
      </div>
      {upload.error && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-twill-700 ring-1 ring-twill-500/30 transition hover:bg-twill-500/10 dark:text-twill-300"
          aria-label={`Retry ${upload.name}`}
        >
          <RotateCw className="size-3.5" /> Retry
        </button>
      )}
      <button
        type="button"
        onClick={onCancel}
        className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-subtle hover:bg-ink/6 hover:text-ink"
        aria-label={upload.error ? "Dismiss" : `Cancel ${upload.name}`}
      >
        <X className="size-4" />
      </button>
    </li>
  );
}

export function AttachmentsCard({ project }) {
  const { uploads: uploadConfig } = useAppConfig();
  const inputRef = useRef(null);
  const [uploads, setUploads] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [toRemove, setToRemove] = useState(null);

  const [addAttachments] = useMutation(ADD_ATTACHMENTS);
  const [removeAttachment] = useMutation(REMOVE_ATTACHMENT, {
    refetchQueries: ["GetProjects"],
  });

  const files = project.attachments;
  const canUpload = uploadConfig.enabled;
  if (!canUpload && files.length === 0) return null;

  const patchUpload = (id, patch) =>
    setUploads((list) => list.map((upload) => (upload.id === id ? { ...upload, ...patch } : upload)));
  const dropUpload = (id) => setUploads((list) => list.filter((upload) => upload.id !== id));

  function startUpload(file) {
    const id = crypto.randomUUID();
    const controller = new AbortController();
    setUploads((list) => [...list, { id, name: file.name, progress: 0, error: null, controller, file, uploaded: null }]);
    run({ id, file, uploaded: null }, controller);
  }

  /** Uploads the file (unless that already worked) and saves it on the project. */
  async function run({ id, file, uploaded }, controller) {
    try {
      if (!uploaded) {
        uploaded = await uploadFile(file, "attachment", {
          onProgress: (progress) => patchUpload(id, { progress }),
          signal: controller.signal,
        });
        // If saving fails, a retry only needs to save; the file is already stored.
        patchUpload(id, { uploaded });
      }
      await addAttachments({ variables: { projectId: project.id, attachments: [uploaded] } });
      dropUpload(id);
    } catch (error) {
      if (error.name === "AbortError") return dropUpload(id);
      // Upload failures carry their own message; save failures come from GraphQL.
      patchUpload(id, { error: error instanceof ApiError ? error.message : parseApolloError(error).message });
    }
  }

  function retry(upload) {
    const controller = new AbortController();
    patchUpload(upload.id, { error: null, progress: upload.uploaded ? 1 : 0, controller });
    run(upload, controller);
  }

  function dismiss(upload) {
    // Stored but never saved on the project: delete it.
    if (upload.uploaded) discardUploads([upload.uploaded]);
    dropUpload(upload.id);
  }

  async function handleFiles(fileList) {
    const chosen = [...fileList];
    const room = MAX_FILES - files.length - uploads.filter((u) => !u.error).length;
    if (chosen.length > room) {
      toast.error(room > 0 ? `You can add ${room} more file${room === 1 ? "" : "s"} to this project.` : "This project already has the maximum of 20 files.");
      chosen.splice(Math.max(room, 0));
    }
    for (const file of chosen) {
      const sizeError = await checkFileSize(file);
      if (sizeError) toast.error(sizeError);
      else startUpload(file);
    }
  }

  async function handleRemove() {
    try {
      await removeAttachment({ variables: { projectId: project.id, attachmentId: toRemove.id } });
      toast.success(`Removed “${toRemove.name}”`);
    } catch (error) {
      toast.error(parseApolloError(error).message);
      throw error;
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Paperclip className="size-4" /> Attachments
          {files.length > 0 && (
            <span className="rounded-full bg-ink/6 px-2 py-0.5 font-mono text-[11px]">{files.length}</span>
          )}
        </h2>
      </div>

      {canUpload && (
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
          className={`mb-4 flex w-full cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition ${
            dragging ? "border-twill-500 bg-twill-500/6" : "border-line-strong hover:border-twill-500/50 hover:bg-ink/3"
          }`}
        >
          <span className="grid size-11 place-items-center rounded-xl bg-twill-500/10 text-twill-600 dark:text-twill-300">
            <UploadCloud className="size-5" />
          </span>
          <span className="mt-3 text-sm font-medium">
            {dragging ? "Drop to upload" : "Drag files here or click to browse"}
          </span>
          <span className="mt-1 text-xs text-subtle">
            Images, videos, PDFs and documents · up to 10 MB (videos 100 MB) · max {MAX_FILES} files
          </span>
        </button>
      )}
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

      {uploads.length > 0 && (
        <ul className="mb-4 space-y-2" aria-live="polite">
          {uploads.map((upload) => (
            <UploadRow
              key={upload.id}
              upload={upload}
              onCancel={() => (upload.error ? dismiss(upload) : upload.controller.abort())}
              onRetry={() => retry(upload)}
            />
          ))}
        </ul>
      )}

      {files.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((file, index) => (
            <Tile key={file.id} file={file} onOpen={() => setViewerIndex(index)} onRemove={() => setToRemove(file)} />
          ))}
        </ul>
      ) : (
        uploads.length === 0 && (
          <p className="flex items-center justify-center gap-1.5 text-sm text-subtle">
            <CircleAlert className="size-4" /> No files yet.
          </p>
        )
      )}

      <AttachmentViewer
        files={files}
        index={viewerIndex !== null && viewerIndex < files.length ? viewerIndex : null}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
      />
      <ConfirmDialog
        open={Boolean(toRemove)}
        onClose={() => setToRemove(null)}
        onConfirm={handleRemove}
        title="Remove this file?"
        confirmLabel="Remove file"
      >
        <strong className="text-ink">{toRemove?.name}</strong> will be permanently deleted from this project.
      </ConfirmDialog>
    </Card>
  );
}
