import { useMutation, useQuery } from "@apollo/client/react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { ADD_PROJECT, GET_CLIENTS, REFRESH_ALL, UPDATE_PROJECT } from "../../graphql/documents";
import { useForm } from "../../hooks/useForm";
import { toDateInput } from "../../lib/format";
import { PRIORITIES, STATUSES } from "../../lib/meta";
import { validateProject } from "../../lib/validation";
import { Button } from "../ui/Button";
import { Field, Input, Select, Textarea } from "../ui/Field";
import { Segmented } from "../ui/Segmented";
import { Skeleton } from "../ui/States";

export function ProjectForm({ project, defaultClientId, defaultStatus, onDone, onCancel, onNewClient }) {
  const isEdit = Boolean(project);
  const { data, loading } = useQuery(GET_CLIENTS);
  const clients = data?.clients ?? [];

  const { values, errors, setField, handleSubmit, submitting } = useForm(
    {
      name: project?.name ?? "",
      description: project?.description ?? "",
      status: project?.status ?? defaultStatus ?? "NOT_STARTED",
      priority: project?.priority ?? "MEDIUM",
      dueDate: toDateInput(project?.dueDate),
      clientId: project?.client?.id ?? defaultClientId ?? "",
    },
    validateProject
  );

  const [addProject] = useMutation(ADD_PROJECT, { refetchQueries: REFRESH_ALL });
  const [updateProject] = useMutation(UPDATE_PROJECT, { refetchQueries: REFRESH_ALL });

  const onSubmit = handleSubmit(async (form) => {
    const input = {
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || null,
      clientId: form.clientId,
    };
    if (isEdit) {
      const { data } = await updateProject({ variables: { id: project.id, input } });
      toast.success("Project updated");
      onDone?.(data.updateProject);
    } else {
      const { data } = await addProject({ variables: { input } });
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
        <p className="mt-1 text-sm text-muted">Add your first client, then come back to create the project.</p>
        <Button variant="brand" className="mt-5" onClick={onNewClient}>
          <UserPlus /> Add a client
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Project name" error={errors.name}>
        {(a11y) => (
          <Input
            {...a11y}
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Website redesign"
            autoFocus
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client" error={errors.clientId}>
          {(a11y) => (
            <Select {...a11y} value={values.clientId} onChange={(e) => setField("clientId", e.target.value)}>
              <option value="" disabled>
                Choose a client…
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.company ? ` · ${client.company}` : ""}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Due date" optional error={errors.dueDate}>
          {(a11y) => (
            <Input {...a11y} type="date" value={values.dueDate} onChange={(e) => setField("dueDate", e.target.value)} />
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
          options={PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
        />
      </div>

      <div className="flex justify-end gap-2 pt-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="brand" loading={submitting}>
          {isEdit ? "Save changes" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
