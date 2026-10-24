import { useMutation, useQuery } from "@apollo/client/react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { ADD_PROJECT, GET_CLIENTS, REFRESH_ALL, UPDATE_PROJECT } from "../../graphql/documents";
import { useAppConfig } from "../../hooks/useAppConfig";
import { PRIORITIES, STATUSES } from "../../lib/meta";
import { AttachmentPicker } from "../attachments/AttachmentPicker";
import { PriorityIcon } from "../ui/Badges";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { DatePicker } from "../ui/DatePicker";
import { Dropdown } from "../ui/Dropdown";
import { Field, Input, Textarea } from "../ui/Field";
import { Segmented } from "../ui/Segmented";
import { Skeleton } from "../ui/States";
import { useProjectDraft } from "./useProjectDraft";

// Icon components for the priority picker, one per level.
const PRIORITY_ICONS = Object.fromEntries(
  PRIORITIES.map(({ value, color }) => [
    value,
    ({ className }) => <PriorityIcon priority={value} className={`${className} ${color}`} />,
  ])
);

/**
 * The project fields, bound to a `useProjectDraft()`. `clientField` fills the
 * slot beside the due date (a client picker, or the client being created).
 */
export function ProjectFields({ draft, clientField, nameRef, autoFocus = true }) {
  const { values, errors, setField } = draft;
  const uploadsEnabled = useAppConfig().uploads.enabled;

  return (
    <>
      <Field label="Project name" error={errors.name}>
        {(a11y) => (
          <Input
            {...a11y}
            ref={nameRef}
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Website redesign"
            autoFocus={autoFocus}
          />
        )}
      </Field>

      <Field label="Description" error={errors.description} hint={`${values.description.length}/2000`}>
        {(a11y) => (
          <Textarea
            {...a11y}
            value={values.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="What does done look like?"
            maxLength={2000}
          />
        )}
      </Field>

      {(uploadsEnabled || draft.files.length > 0) && <AttachmentPicker items={draft.files} setItems={draft.setFiles} />}

      <div className="grid gap-4 sm:grid-cols-2">
        {clientField}
        <Field label="Due date" optional error={errors.dueDate}>
          {(a11y) => (
            <DatePicker
              {...a11y}
              value={values.dueDate}
              onChange={(dueDate) => setField("dueDate", dueDate)}
              placeholder="No deadline"
            />
          )}
        </Field>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium">Status</p>
        <Segmented
          label="Status"
          className="w-full"
          value={values.status}
          onChange={(value) => setField("status", value)}
          options={STATUSES.map((s) => ({ value: s.value, label: s.label, dot: s.dot }))}
        />
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium">Priority</p>
        <Segmented
          label="Priority"
          className="w-full"
          value={values.priority}
          onChange={(value) => setField("priority", value)}
          options={PRIORITIES.map((p) => ({ value: p.value, label: p.label, icon: PRIORITY_ICONS[p.value] }))}
        />
      </div>
    </>
  );
}

export function ProjectForm({ project, defaultClientId, defaultStatus, onDone, onCancel, onNewClient }) {
  const isEdit = Boolean(project);
  const { data, loading } = useQuery(GET_CLIENTS);
  const clients = data?.clients ?? [];
  const draft = useProjectDraft(project, { defaultClientId, defaultStatus });
  const { values, errors, setField, uploading } = draft;

  const [addProject] = useMutation(ADD_PROJECT, { refetchQueries: REFRESH_ALL });
  const [updateProject] = useMutation(UPDATE_PROJECT, { refetchQueries: REFRESH_ALL });

  const onSubmit = draft.handleSubmit(async () => {
    if (uploading) {
      toast.error("Please wait for the files to finish uploading.");
      return;
    }
    const input = draft.toInput();
    if (isEdit) {
      const keptIds = new Set(draft.files.filter((file) => file.status === "saved").map((file) => file.attachment.id));
      input.addAttachments = draft.newFiles();
      input.removeAttachmentIds = project.attachments.filter((file) => !keptIds.has(file.id)).map((file) => file.id);
      const { data } = await updateProject({ variables: { id: project.id, input } });
      draft.markSaved();
      toast.success("Project updated");
      onDone?.(data.updateProject);
    } else {
      input.attachments = draft.newFiles();
      const { data } = await addProject({ variables: { input } });
      draft.markSaved();
      toast.success(`“${data.addProject.name}” is on the board`);
      onDone?.(data.addProject);
    }
  });

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-11" />
        <Skeleton className="h-28" />
        <Skeleton className="h-11" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="rounded-2xl bg-elevated p-6 text-center ring-1 ring-line">
        <p className="font-medium">Every project belongs to a client.</p>
        <p className="mt-1 text-sm text-muted">Add your first client, and their first project, in one go.</p>
        <Button variant="brand" className="mt-5" onClick={onNewClient}>
          <UserPlus /> Add a client
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <ProjectFields
        draft={draft}
        clientField={
          <Field label="Client" error={errors.clientId}>
            {(a11y) => (
              <Dropdown
                {...a11y}
                value={values.clientId}
                onChange={(clientId) => setField("clientId", clientId)}
                placeholder="Choose a client…"
                searchable={clients.length > 6}
                options={clients.map((client) => ({
                  value: client.id,
                  label: client.name,
                  description: client.company ?? client.email,
                  icon: <Avatar name={client.name} src={client.avatarThumbUrl} size="sm" />,
                }))}
              />
            )}
          </Field>
        }
      />

      <div className="flex justify-end gap-2 pt-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="brand" loading={draft.submitting} disabled={uploading}>
          {uploading ? "Uploading…" : isEdit ? "Save changes" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
