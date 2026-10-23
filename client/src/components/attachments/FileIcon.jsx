import { File, FileImage, FileSpreadsheet, FileText, FileVideo, Presentation } from "lucide-react";

import { extensionOf } from "./fileMeta";

const SPREADSHEETS = new Set(["xls", "xlsx", "ods", "csv", "numbers"]);
const SLIDES = new Set(["ppt", "pptx", "odp", "key"]);

/** Icon matching an attachment's type. */
export function FileIcon({ file, className }) {
  const extension = extensionOf(file);
  if (file.kind === "IMAGE") return <FileImage className={className} />;
  if (file.kind === "VIDEO") return <FileVideo className={className} />;
  if (SPREADSHEETS.has(extension)) return <FileSpreadsheet className={className} />;
  if (SLIDES.has(extension)) return <Presentation className={className} />;
  if (file.kind === "PDF" || file.kind === "DOCUMENT") return <FileText className={className} />;
  return <File className={className} />;
}
