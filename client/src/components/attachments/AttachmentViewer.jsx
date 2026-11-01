import { ChevronLeft, ChevronRight, Download, ExternalLink, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { formatBytes } from "../../lib/uploads";
import { buttonClasses } from "../ui/buttonClasses";
import { Modal } from "../ui/Modal";
import { FileIcon } from "./FileIcon";
import { officeViewerUrl } from "./fileMeta";

// Documents and unknown-size media get a fixed stage, so the dialog is its
// final size from the start instead of growing when the file arrives.
const STAGE = "h-[min(70vh,44rem)]";

/**
 * Sizes the preview before the file loads. Images and videos with known
 * dimensions get a box of the right shape (never upscaled past their natural
 * width); while loading it shows the thumbnail, blurred, with a spinner.
 */
function Stage({ file, loaded, failed, children }) {
  const known = file.width > 0 && file.height > 0;
  const sized = known && (file.kind === "IMAGE" || file.kind === "VIDEO");
  const placeholder = file.kind === "IMAGE" ? file.thumbnailUrl : null;

  return (
    <div
      className={`relative mx-auto w-full overflow-hidden rounded-xl ${sized ? "max-h-[70vh]" : STAGE} ${
        file.kind === "VIDEO" ? "bg-black" : "bg-elevated"
      }`}
      style={sized ? { aspectRatio: `${file.width} / ${file.height}`, maxWidth: `min(100%, ${file.width}px, calc(70vh * ${file.width / file.height}))` } : undefined}
    >
      {children}
      {!loaded && !failed && (
        <div className="absolute inset-0 grid place-items-center" role="status" aria-label="Loading preview">
          {placeholder ? (
            <img src={placeholder} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-xl" />
          ) : (
            <div className="absolute inset-0 animate-pulse bg-ink/4" />
          )}
          <span className="relative flex items-center gap-2 rounded-full bg-surface/90 px-3.5 py-2 text-sm text-muted shadow-soft ring-1 ring-line backdrop-blur-sm">
            <LoaderCircle className="size-4 animate-spin text-twill-500" /> Loading preview…
          </span>
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div>
            <FileIcon file={file} className="mx-auto size-12 text-subtle" />
            <p className="mt-3 text-sm text-muted">The preview couldn’t load. Open it in a new tab or download it instead.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Preview({ file }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const fade = `transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`;
  const events = { onLoad: () => setLoaded(true), onError: () => setFailed(true) };

  if (file.kind === "IMAGE") {
    return (
      <Stage file={file} loaded={loaded} failed={failed}>
        <img src={file.url} alt={file.name} decoding="async" className={`absolute inset-0 size-full object-contain ${fade}`} {...events} />
      </Stage>
    );
  }
  if (file.kind === "VIDEO") {
    return (
      <Stage file={file} loaded={loaded} failed={failed}>
        <video
          src={file.url}
          controls
          autoPlay
          playsInline
          className={`absolute inset-0 size-full object-contain ${fade}`}
          onLoadedData={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      </Stage>
    );
  }
  const embed = file.kind === "PDF" ? file.url : officeViewerUrl(file);
  if (embed) {
    // Iframes don't report load errors, only that loading finished.
    return (
      <Stage file={file} loaded={loaded} failed={false}>
        <iframe src={embed} title={file.name} className={`absolute inset-0 size-full bg-white ${fade}`} onLoad={() => setLoaded(true)} />
      </Stage>
    );
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

/** Warms the browser cache with the neighbouring images, so stepping through is instant. */
function usePreloadNeighbours(files, index) {
  useEffect(() => {
    if (index === null || files.length < 2) return;
    for (const step of [1, -1]) {
      const next = files[(index + step + files.length) % files.length];
      if (next.kind === "IMAGE") new Image().src = next.url;
    }
  }, [files, index]);
}

/** Full-size preview of one attachment, with previous/next navigation. */
export function AttachmentViewer({ files, index, onIndexChange, onClose }) {
  const file = index === null ? null : files[index];
  const hasMany = files.length > 1;
  usePreloadNeighbours(files, index);
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
