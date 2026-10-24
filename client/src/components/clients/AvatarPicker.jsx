import { Check, Link2, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAppConfig } from "../../hooks/useAppConfig";
import { AVATAR_ACCEPT, discardUploads, uploadFile } from "../../lib/uploads";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Input } from "../ui/Field";

const URL_PATTERN = /^https?:\/\/\S+$/i;

// Client photo: upload from the device (Cloudinary) or paste an image URL.
// value = { avatarUrl, avatarPublicId }.
export function AvatarPicker({ name, value, onChange, error, onBusyChange }) {
  const { uploads } = useAppConfig();
  const inputRef = useRef(null);
  const controllerRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [urlMode, setUrlMode] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlError, setUrlError] = useState(null);

  const uploading = progress !== null;

  const unmountedRef = useRef(false);
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      controllerRef.current?.abort();
    };
  }, []);

  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file (PNG, JPG, WebP, GIF or AVIF).");
      return;
    }
    setUploadError(null);
    setProgress(0);
    onBusyChange?.(true);
    controllerRef.current = new AbortController();
    try {
      const result = await uploadFile(file, "avatar", {
        onProgress: setProgress,
        signal: controllerRef.current.signal,
      });
      // Finished after the form closed: nothing will save it, so clean it up.
      if (unmountedRef.current) return discardUploads([result]);
      onChange({ avatarUrl: result.url, avatarPublicId: result.publicId });
    } catch (err) {
      if (err.name !== "AbortError") setUploadError(err.message);
    } finally {
      setProgress(null);
      onBusyChange?.(false);
    }
  }

  function applyUrl() {
    const url = urlDraft.trim();
    if (!URL_PATTERN.test(url)) {
      setUrlError("Enter an image link starting with http:// or https://");
      return;
    }
    onChange({ avatarUrl: url, avatarPublicId: null });
    setUrlMode(false);
    setUrlDraft("");
    setUrlError(null);
  }

  const message = uploadError ?? urlError ?? error;

  return (
    <div>
      <p className="mb-1.5 flex items-baseline justify-between text-sm font-medium">
        Photo <span className="text-xs font-normal text-subtle">Optional</span>
      </p>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar name={name || "?"} src={value.avatarUrl} size="xl" />
          {uploading && (
            <div className="absolute inset-0 grid place-items-center rounded-full bg-black/55 text-xs font-semibold text-white">
              {Math.round(progress * 100)}%
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {urlMode ? (
            <div className="flex gap-2">
              <Input
                type="url"
                value={urlDraft}
                onChange={(e) => {
                  setUrlDraft(e.target.value);
                  setUrlError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyUrl();
                  }
                  if (e.key === "Escape") {
                    // Close only the URL field, not the whole dialog.
                    e.preventDefault();
                    e.stopPropagation();
                    setUrlMode(false);
                  }
                }}
                placeholder="https://…/photo.jpg"
                aria-label="Image URL"
                aria-invalid={Boolean(urlError) || undefined}
                autoFocus
              />
              <Button variant="secondary" size="icon" className="size-11" onClick={applyUrl} aria-label="Use this URL">
                <Check />
              </Button>
              <Button variant="ghost" size="icon" className="size-11" onClick={() => setUrlMode(false)} aria-label="Cancel">
                <X />
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {uploads.enabled &&
                (uploading ? (
                  <Button variant="secondary" size="sm" onClick={() => controllerRef.current?.abort()}>
                    <X /> Cancel upload
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                    <Upload /> Upload from device
                  </Button>
                ))}
              <Button variant="secondary" size="sm" onClick={() => setUrlMode(true)} disabled={uploading}>
                <Link2 /> Use image URL
              </Button>
              {value.avatarUrl && !uploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ avatarUrl: null, avatarPublicId: null })}
                  className="hover:bg-red-500/10 hover:text-red-600"
                >
                  <Trash2 /> Remove
                </Button>
              )}
            </div>
          )}
          {message ? (
            <p className="mt-2 text-[13px] text-red-600 dark:text-red-400">{message}</p>
          ) : (
            <p className="mt-2 text-[13px] text-subtle">
              {uploads.enabled ? "PNG, JPG, WebP or GIF up to 10 MB, or a link to an image." : "Paste a link to an image."}
            </p>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
