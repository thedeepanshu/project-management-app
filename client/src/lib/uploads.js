import { ApiError, getAppConfig, postJSON } from "./api";

// Files go straight from the browser to Cloudinary using a short-lived
// signature from our server, so large videos never pass through the API.

export const ATTACHMENT_ACCEPT =
  "image/*,video/*,application/pdf,.doc,.docx,.odt,.rtf,.txt,.md,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp";

export const AVATAR_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/avif";

const MB = 1024 * 1024;

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`;
}

function resourceTypeOf(file) {
  if (file.type.startsWith("video/") || file.type.startsWith("audio/")) return "video";
  if (file.type.startsWith("image/") || file.type === "application/pdf") return "image";
  return "raw";
}

/** Returns an error message if the file is too big for its type, else null. */
export async function checkFileSize(file) {
  const { uploads } = await getAppConfig();
  const limit = uploads.maxBytes?.[resourceTypeOf(file)];
  if (limit && file.size > limit) {
    return `“${file.name}” is ${formatBytes(file.size)}; the limit for this type of file is ${formatBytes(limit)}.`;
  }
  return null;
}

/**
 * Uploads one file. purpose: "attachment" | "avatar".
 * Resolves with the metadata the GraphQL AttachmentInput expects.
 */
export async function uploadFile(file, purpose, { onProgress, signal } = {}) {
  const sizeError = await checkFileSize(file);
  if (sizeError) throw new ApiError(sizeError);

  const signed = await postJSON("/api/uploads/signature", { purpose }, { signal });
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", signed.timestamp);
  form.append("folder", signed.folder);
  form.append("signature", signed.signature);

  // XMLHttpRequest rather than fetch, because fetch can't report upload progress.
  const result = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${signed.cloudName}/${signed.resourceType}/upload`);
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress?.(event.loaded / event.total);
    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // handled below
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) resolve(body);
      else reject(new ApiError(body?.error?.message ?? `Upload of “${file.name}” failed.`));
    };
    xhr.onerror = () => reject(new ApiError(`Upload of “${file.name}” failed. Check your connection.`));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(form);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    format: result.format ?? null,
    name: file.name,
    bytes: result.bytes,
    width: result.width ?? null,
    height: result.height ?? null,
  };
}
