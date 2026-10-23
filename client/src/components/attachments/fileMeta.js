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
