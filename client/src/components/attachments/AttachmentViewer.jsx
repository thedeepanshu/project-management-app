import { ChevronLeft, ChevronRight, Download, ExternalLink } from "lucide-react";
import { useEffect } from "react";

import { formatBytes } from "../../lib/uploads";
import { buttonClasses } from "../ui/buttonClasses";
import { Modal } from "../ui/Modal";
import { FileIcon } from "./FileIcon";
import { officeViewerUrl } from "./fileMeta";

function Preview({ file }) {
  if (file.kind === "IMAGE") {
    return <img src={file.url} alt={file.name} className="mx-auto max-h-[70vh] w-auto rounded-xl object-contain" />;
  }
  if (file.kind === "VIDEO") {
    return <video src={file.url} controls autoPlay playsInline className="mx-auto max-h-[70vh] w-full rounded-xl bg-black" />;
  }
  const embed = file.kind === "PDF" ? file.url : officeViewerUrl(file);
  if (embed) {
    return <iframe src={embed} title={file.name} className="h-[70vh] w-full rounded-xl bg-white ring-1 ring-line" />;
  }
  return (
    <div className="grid h-72 place-items-center rounded-xl bg-elevated text-center ring-1 ring-line">
      <div>
        <FileIcon file={file} className="mx-auto size-12 text-subtle" />
        <p className="mt-3 text-sm text-muted">No preview for this file type. Download it to open.</p>
      </div>
    </div>
  );
}

/** Full-size preview of one attachment, with previous/next navigation. */
export function AttachmentViewer({ files, index, onIndexChange, onClose }) {
  const file = index === null ? null : files[index];
  const hasMany = files.length > 1;
  const go = (step) => onIndexChange((index + step + files.length) % files.length);

  useEffect(() => {
    if (!file || !hasMany) return;
    function onKeyDown(event) {
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <Modal
      open={Boolean(file)}
      onClose={onClose}
      size="lg"
      title={file?.name ?? ""}
      description={file ? `${formatBytes(file.bytes)}${hasMany ? ` · ${index + 1} of ${files.length}` : ""}` : ""}
    >
      {file && (
        <>
          <div className="relative">
            <Preview key={file.id} file={file} />
            {hasMany && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute top-1/2 left-2 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-surface/90 shadow-lift ring-1 ring-line transition hover:bg-surface"
                  aria-label="Previous file"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-surface/90 shadow-lift ring-1 ring-line transition hover:bg-surface"
                  aria-label="Next file"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <a href={file.url} target="_blank" rel="noreferrer" className={buttonClasses({ variant: "secondary" })}>
              <ExternalLink /> Open in new tab
            </a>
            <a
              href={file.url.replace("/upload/", "/upload/fl_attachment/")}
              className={buttonClasses({ variant: "primary" })}
            >
              <Download /> Download
            </a>
          </div>
        </>
      )}
    </Modal>
  );
}
