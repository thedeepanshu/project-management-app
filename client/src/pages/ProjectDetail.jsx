import { useMutation, useQuery } from "@apollo/client/react";
import { ArrowLeft, CalendarDays, Clock3, Mail, Pencil, Phone, SearchX, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { AttachmentsCard } from "../components/attachments/AttachmentsCard";
import { DueLabel } from "../components/projects/ProjectCard";
import { Avatar } from "../components/ui/Avatar";
import { OverdueBadge, PriorityBadge, StatusBadge } from "../components/ui/Badges";
import { Button, ButtonLink } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Segmented } from "../components/ui/Segmented";
import { Card, EmptyState, ErrorState, Skeleton } from "../components/ui/States";
import { useWorkspace } from "../context/workspace";
import { DELETE_PROJECT, GET_PROJECT, REFRESH_ALL } from "../graphql/documents";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useSetProjectStatus } from "../hooks/useSetProjectStatus";
import { formatDate, formatRelative, isOverdue } from "../lib/format";
import { STATUSES } from "../lib/meta";
import { parseApolloError } from "../lib/validation";

function Detail({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink/5 text-muted">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <dt className="text-xs text-subtle">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium">{children}</dd>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { editProject } = useWorkspace();
  const setStatus = useSetProjectStatus();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_PROJECT, { variables: { id } });
  const [deleteProject] = useMutation(DELETE_PROJECT, {
    refetchQueries: REFRESH_ALL.filter((name) => name !== "GetProject"),
  });
  const project = data?.project;
  useDocumentTitle(project?.name ?? "Project");

  async function handleDelete() {
    try {
      await deleteProject({
        variables: { id },
        update(cache) {
          cache.evict({ id: cache.identify(project) });
          cache.gc();
        },
      });
      toast.success(`“${project.name}” deleted`);
      navigate("/projects", { replace: true });
    } catch (err) {
      toast.error(parseApolloError(err).message);
      throw err;
    }
  }

  const back = (
    <Link to="/projects" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
      <ArrowLeft className="size-4" /> All projects
    </Link>
  );

  if (loading && !data) {
    return (
      <>
        {back}
        <Skeleton className="mb-4 h-12 w-2/3" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-3xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </>
    );
  }

  // An invalid id comes back as a BAD_USER_INPUT error; treat it like "not found".
  const notFound = !project && (!error || error.errors?.some((e) => e.extensions?.code === "BAD_USER_INPUT"));
  if (notFound) {
    return (
      <>
        {back}
        <EmptyState
          icon={SearchX}
          title="Project not found"
          action={<ButtonLink to="/projects" variant="secondary">Back to projects</ButtonLink>}
        >
          It may have been deleted, or the link is incorrect.
        </EmptyState>
      </>
    );
  }
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const { client } = project;

  return (
    <>
      {back}

      <header className="mb-8 animate-rise">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={project.status} />
          {isOverdue(project) && <OverdueBadge />}
          <PriorityBadge priority={project.priority} />
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">{project.name}</h1>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={() => editProject(project)}>
              <Pencil /> Edit
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmOpen(true)}
              aria-label="Delete project"
              title="Delete project"
              className="hover:bg-red-500/10 hover:text-red-600"
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-3 text-sm font-semibold text-muted">Move to</h2>
            <Segmented
              label="Project status"
              className="w-full"
              value={project.status}
              onChange={(status) => setStatus(project, status)}
              options={STATUSES.map((s) => ({ value: s.value, label: s.label, dot: s.dot }))}
            />
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 text-sm font-semibold text-muted">Description</h2>
            <p className="leading-relaxed whitespace-pre-line">{project.description}</p>
          </Card>

          <AttachmentsCard project={project} />

          <Card className="p-6">
            <dl className="grid gap-5 sm:grid-cols-3">
              <Detail icon={CalendarDays} label="Due date">
                {project.dueDate ? (
                  <span className="flex flex-col">
                    {formatDate(project.dueDate)}
                    <DueLabel project={project} />
                  </span>
                ) : (
                  <span className="text-subtle">No deadline</span>
                )}
              </Detail>
              <Detail icon={Clock3} label="Created">
                {formatDate(project.createdAt)}
              </Detail>
              <Detail icon={Pencil} label="Last updated">
                {formatRelative(project.updatedAt)}
              </Detail>
            </dl>
          </Card>
        </div>

        <aside>
          <Card className="relative overflow-hidden p-6">
            <div className="bg-twill absolute inset-x-0 top-0 h-24 [mask-image:linear-gradient(black,transparent)]" />
            <h2 className="relative mb-5 text-sm font-semibold text-muted">Client</h2>
            {client ? (
              <div className="relative">
                <Link to={`/clients/${client.id}`} className="group flex items-center gap-3">
                  <Avatar name={client.name} src={client.avatarThumbUrl} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-bold group-hover:text-twill-600 dark:group-hover:text-twill-300">
                      {client.name}
                    </p>
                    {client.company && <p className="truncate text-sm text-muted">{client.company}</p>}
                  </div>
                </Link>
                <div className="mt-6 space-y-2">
                  <a
                    href={`mailto:${client.email}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ring-1 ring-line transition hover:bg-ink/4"
                  >
                    <Mail className="size-4 text-muted" />
                    <span className="truncate">{client.email}</span>
                  </a>
                  <a
                    href={`tel:${client.phone.replace(/[^\d+]/g, "")}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ring-1 ring-line transition hover:bg-ink/4"
                  >
                    <Phone className="size-4 text-muted" />
                    {client.phone}
                  </a>
                </div>
              </div>
            ) : (
              <p className="relative text-sm text-subtle">This project’s client was removed.</p>
            )}
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete this project?"
        confirmLabel="Delete project"
        confirmText={project.name}
      >
        <strong className="text-ink">{project.name}</strong> will be permanently deleted. This can’t be undone.
      </ConfirmDialog>
    </>
  );
}
