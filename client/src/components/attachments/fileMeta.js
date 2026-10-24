/** Most files a single project can hold (matches the server limit). */
export const MAX_FILES = 20;

/** AttachmentPicker item for a file already saved on the project (edit mode). */
export function savedItem(attachment) {
  return { key: attachment.id, status: "saved", attachment, name: attachment.name, bytes: attachment.bytes };
}

// Formats Microsoft's free online viewer can display from a public URL.
const OFFICE_VIEWER = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx"]);

export function extensionOf(file) {
  return (file.format || file.name.split(".").pop() || "").toLowerCase();
}

export function officeViewerUrl(file) {
  return OFFICE_VIEWER.has(extensionOf(file))
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`
    : null;
}
