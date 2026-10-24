import { useEffect, useRef, useState } from "react";

import { useForm } from "../../hooks/useForm";
import { toDateInput } from "../../lib/format";
import { discardUploads } from "../../lib/uploads";
import { validateProject } from "../../lib/validation";
import { savedItem } from "../attachments/fileMeta";

// For a project whose client doesn't exist yet (it's created alongside).
const validateWithoutClient = (values) => validateProject({ ...values, clientId: "pending" });

/**
 * A project's form state and attachments. Closing the form without
 * `markSaved()` stops uploads and deletes files uploaded here but never saved.
 * `clientPending`: the client is created together with the project, so it
 * isn't chosen (or validated) here.
 */
export function useProjectDraft(project, { defaultClientId, defaultStatus, clientPending = false } = {}) {
  const form = useForm(
    {
      name: project?.name ?? "",
      description: project?.description ?? "",
      status: project?.status ?? defaultStatus ?? "NOT_STARTED",
      priority: project?.priority ?? "MEDIUM",
      dueDate: toDateInput(project?.dueDate),
      clientId: project?.client?.id ?? defaultClientId ?? "",
    },
    clientPending ? validateWithoutClient : validateProject
  );

  const [files, setFiles] = useState(() => (project?.attachments ?? []).map(savedItem));
  const uploading = files.some((file) => file.status === "uploading");

  const savedRef = useRef(false);
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  useEffect(
    () => () => {
      const pending = filesRef.current;
      pending.forEach((file) => {
        file.controller?.abort();
        if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
      });
      if (!savedRef.current) discardUploads(pending.filter((file) => file.status === "ready").map((file) => file.input));
    },
    []
  );

  const { values } = form;
  return {
    ...form,
    files,
    setFiles,
    uploading,
    markSaved: () => {
      savedRef.current = true;
    },
    /** Newly uploaded files, as attachment inputs. */
    newFiles: () => files.filter((file) => file.status === "ready").map((file) => file.input),
    toInput: () => ({
      name: values.name.trim(),
      description: values.description.trim(),
      status: values.status,
      priority: values.priority,
      dueDate: values.dueDate || null,
      clientId: values.clientId,
    }),
  };
}
