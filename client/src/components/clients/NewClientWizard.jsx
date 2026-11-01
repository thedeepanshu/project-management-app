import { useMutation } from "@apollo/client/react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ADD_CLIENT, ADD_PROJECT, REFRESH_ALL } from "../../graphql/documents";
import { photoThumb } from "../../lib/images";
import { parseApolloError } from "../../lib/validation";
import { ProjectFields } from "../projects/ProjectForm";
import { useProjectDraft } from "../projects/useProjectDraft";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { ModalFooter } from "../ui/Modal";
import { ClientFields } from "./ClientForm";
import { useClientDraft } from "./useClientDraft";

const STEPS = [
  { title: "Client details" },
  { title: "First project", optional: true },
];

/**
 * "New client" in two steps: the client, then (optionally) their first
 * project. Nothing is saved until the end. Both steps stay mounted, so going
 * Back keeps everything typed and uploads carry on in the background.
 */
export function NewClientWizard({ onDone, onCancel }) {
  const client = useClientDraft();
  const project = useProjectDraft(null, { clientPending: true });
  const [step, setStep] = useState(0);
  // Set once the client exists: if only the project failed, a retry must not
  // create the client a second time.
  const [savedClient, setSavedClient] = useState(null);
  const [saving, setSaving] = useState(null); // "client" | "project"
  const projectNameRef = useRef(null);

  const [addClient] = useMutation(ADD_CLIENT, { refetchQueries: REFRESH_ALL });
  const [addProject] = useMutation(ADD_PROJECT, { refetchQueries: REFRESH_ALL });

  useEffect(() => {
    if (step === 1) projectNameRef.current?.focus();
  }, [step]);

  function goToProject() {
    if (client.check()) setStep(1);
  }

  /** Creates the client (once). On a server error, shows it on step 1. */
  async function ensureClient() {
    if (savedClient) return savedClient;
    try {
      const { data } = await addClient({ variables: { input: client.toInput() } });
      client.markSaved();
      setSavedClient(data.addClient);
      return data.addClient;
    } catch (error) {
      const { message, fields } = parseApolloError(error);
      client.setErrors(fields);
      setStep(0);
      toast.error(message);
      return null;
    }
  }

  async function finish(withProject) {
    if (!client.check()) {
      setStep(0);
      return;
    }
    if (withProject) {
      if (!project.check()) return;
      if (project.uploading) {
        toast.error("Please wait for the files to finish uploading.");
        return;
      }
    }

    setSaving(withProject ? "project" : "client");
    try {
      const saved = await ensureClient();
      if (!saved) return;
      if (!withProject) {
        toast.success(`${saved.name} added to your clients`);
        onDone?.(saved);
        return;
      }
      try {
        const input = { ...project.toInput(), clientId: saved.id, attachments: project.newFiles() };
        const { data } = await addProject({ variables: { input } });
        project.markSaved();
        toast.success(`${saved.name} added, with “${data.addProject.name}” on the board`);
        onDone?.(saved);
      } catch (error) {
        const { message, fields } = parseApolloError(error);
        project.setErrors(fields);
        toast.error(`${saved.name} was added, but the project wasn’t: ${message}`);
      }
    } finally {
      setSaving(null);
    }
  }

  const busy = saving !== null || client.photoBusy;
  const name = client.values.name.trim();

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (step === 0) goToProject();
        else finish(true);
      }}
    >
      <Stepper step={step} onBack={savedClient ? null : () => setStep(0)} />

      <div hidden={step !== 0} className="space-y-4">
        <ClientFields draft={client} />
      </div>

      <div hidden={step !== 1} className="space-y-4">
        <ProjectFields
          draft={project}
          nameRef={projectNameRef}
          autoFocus={false}
          clientField={
            <div>
              <p className="mb-1.5 flex min-h-6 items-center text-sm font-medium">Client</p>
              <div className="flex h-11 items-center gap-2.5 rounded-xl bg-elevated px-3 ring-1 ring-line">
                <Avatar name={name || "?"} src={photoThumb(client.values.avatarUrl, 80)} size="sm" />
                <span className="min-w-0 flex-1 truncate text-[15px]">{name}</span>
                <span className="rounded-full bg-twill-500/12 px-2 py-0.5 text-[11px] font-semibold text-twill-700 dark:text-twill-300">
                  {savedClient ? "Added" : "New"}
                </span>
              </div>
            </div>
          }
        />
      </div>

      <ModalFooter className="mt-4 flex flex-wrap items-center gap-2">
        {step === 0 ? (
          <>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="secondary" className="ml-auto" onClick={() => finish(false)} loading={saving === "client"} disabled={busy}>
              Just add client
            </Button>
            <Button type="submit" variant="brand" className="max-sm:w-full" disabled={busy}>
              Next: first project <ArrowRight />
            </Button>
          </>
        ) : (
          <>
            {!savedClient && (
              <Button variant="ghost" onClick={() => setStep(0)} disabled={saving !== null}>
                <ArrowLeft /> <span className="max-[340px]:sr-only">Back</span>
              </Button>
            )}
            <Button variant="secondary" className="ml-auto" onClick={() => finish(false)} loading={saving === "client"} disabled={busy}>
              {savedClient ? "Add the project later" : "Skip, just add client"}
            </Button>
            <Button type="submit" variant="brand" className="max-sm:w-full" loading={saving === "project"} disabled={busy || project.uploading}>
              {project.uploading ? "Uploading…" : savedClient ? "Create project" : "Add client & project"}
            </Button>
          </>
        )}
      </ModalFooter>
    </form>
  );
}

/** "1 Client details — 2 First project". The first step is clickable from the second. */
function Stepper({ step, onBack }) {
  return (
    <ol className="mb-6 flex items-center gap-3" aria-label="Steps">
      {STEPS.map(({ title, optional }, index) => {
        const done = index < step;
        const current = index === step;
        const clickable = done && onBack;
        const Tag = clickable ? "button" : "span";
        return (
          <li key={title} className={`flex items-center gap-3 ${index > 0 ? "flex-1" : ""}`} aria-current={current ? "step" : undefined}>
            {index > 0 && <span className={`h-px flex-1 transition-colors ${step >= index ? "bg-twill-500/60" : "bg-line-strong"}`} />}
            <Tag
              {...(clickable && { type: "button", onClick: onBack })}
              className={`flex items-center gap-2.5 rounded-full text-sm transition ${clickable ? "cursor-pointer hover:opacity-80" : ""}`}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold transition-colors ${
                  current
                    ? "bg-twill-600 text-white shadow-[0_4px_14px_-4px] shadow-twill-600/70"
                    : done
                      ? "bg-twill-500/15 text-twill-700 dark:text-twill-300"
                      : "bg-ink/6 text-subtle"
                }`}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
              </span>
              <span className={`text-left leading-tight ${current ? "font-semibold text-ink" : "text-muted"}`}>
                {title}
                {optional && <span className="block text-[11px] font-normal text-subtle">Optional</span>}
              </span>
            </Tag>
          </li>
        );
      })}
    </ol>
  );
}
