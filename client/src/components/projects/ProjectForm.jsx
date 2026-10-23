import { useMutation, useQuery } from "@apollo/client/react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { ADD_PROJECT, GET_CLIENTS, REFRESH_ALL, UPDATE_PROJECT } from "../../graphql/documents";
import { useAppConfig } from "../../hooks/useAppConfig";
import { useForm } from "../../hooks/useForm";
import { useDescriptionAI, useTitleAI } from "../../hooks/useProjectAI";
import { toDateInput } from "../../lib/format";
import { PRIORITIES, STATUSES } from "../../lib/meta";
import { validateProject } from "../../lib/validation";
import { AIButton } from "../ai/AIButton";
import { DescriptionSuggestion } from "../ai/DescriptionSuggestion";
import { PriorityIcon } from "../ui/Badges";
import { Button } from "../ui/Button";
import { Field, Input, Select, Textarea } from "../ui/Field";
import { Segmented } from "../ui/Segmented";
import { Skeleton } from "../ui/States";

// Icon components for the priority picker, one per level.
const PRIORITY_ICONS = Object.fromEntries(
  PRIORITIES.map(({ value, color }) => [
    value,
    ({ className }) => <PriorityIcon priority={value} className={`${className} ${color}`} />,
  ])
);

export function ProjectForm({ project, defaultClientId, defaultStatus, onDone, onCancel, onNewClient }) {
  const isEdit = Boolean(project);
  const { data, loading } = useQuery(GET_CLIENTS);
  const clients = data?.clients ?? [];
  const aiEnabled = useAppConfig().ai.enabled;
  const descriptionAI = useDescriptionAI();
  const titleAI = useTitleAI();

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
      <div>
        <Field
          label="Project name"
          error={errors.name ?? titleAI.error}
          action={
            aiEnabled && (
              <AIButton
                loading={titleAI.loading}
                disabled={!values.name.trim()}
                title={values.name.trim() ? "Suggest clearer titles" : "Type a title first"}
                onClick={() => titleAI.suggest({ name: values.name, description: values.description })}
              >
                Suggest
              </AIButton>
            )
          }
        >
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
        {titleAI.titles.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2" aria-live="polite">
            {titleAI.titles.map((title) => (
              <button
                key={title}
                type="button"
                onClick={() => {
                  setField("name", title);
                  titleAI.clear();
                }}
                className="cursor-pointer rounded-full bg-twill-500/8 px-3 py-1 text-sm ring-1 ring-twill-500/25 transition hover:bg-twill-500/15"
                title="Use this title"
              >
                {title}
              </button>
            ))}
            <button
              type="button"
              onClick={titleAI.clear}
              className="cursor-pointer text-xs text-subtle hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      <div>
        <Field
          label="Description"
          error={errors.description}
          hint={`${values.description.length}/2000`}
          action={
            aiEnabled && (
              <AIButton
                loading={descriptionAI.suggestion?.streaming}
                disabled={!values.name.trim() && !values.description.trim()}
                title={
                  values.description.trim()
                    ? "Polish the wording of this description"
                    : values.name.trim()
                      ? "Write a first draft from the project name"
                      : "Type a project name or description first"
                }
                onClick={() =>
                  descriptionAI.run({
                    name: values.name,
                    description: values.description,
                    clientId: values.clientId,
                    priority: values.priority,
                    dueDate: values.dueDate,
                  })
                }
              >
                {values.description.trim() ? "Enhance" : "Draft from title"}
              </AIButton>
            )
          }
        >
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
        {descriptionAI.suggestion && (
          <DescriptionSuggestion
            {...descriptionAI.suggestion}
            onAccept={() => {
              setField("description", descriptionAI.suggestion.text.slice(0, 2000));
              descriptionAI.clear();
            }}
            onRetry={() =>
              descriptionAI.run({
                name: values.name,
                description: values.description,
                clientId: values.clientId,
                priority: values.priority,
                dueDate: values.dueDate,
              })
            }
            onStop={descriptionAI.stop}
            onDiscard={descriptionAI.clear}
          />
        )}
      </div>

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
          options={PRIORITIES.map((p) => ({ value: p.value, label: p.label, icon: PRIORITY_ICONS[p.value] }))}
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
