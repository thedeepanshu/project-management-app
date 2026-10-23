import { useQuery } from "@apollo/client/react";
import { ArrowLeft, Building2, CalendarDays, FolderKanban, Mail, Pencil, Phone, Plus, SearchX, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { DeleteClientDialog } from "../components/clients/DeleteClientDialog";
import { ProgressThread } from "../components/clients/ClientCard";
import { ProjectCard } from "../components/projects/ProjectCard";
import { Avatar } from "../components/ui/Avatar";
import { Button, ButtonLink } from "../components/ui/Button";
import { Card, EmptyState, ErrorState, Skeleton } from "../components/ui/States";
import { useWorkspace } from "../context/workspace";
import { GET_CLIENT } from "../graphql/documents";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { formatDate, pluralize } from "../lib/format";
import { STATUSES } from "../lib/meta";

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { editClient, newProject } = useWorkspace();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { data, loading, error, refetch } = useQuery(GET_CLIENT, { variables: { id } });
  const client = data?.client;
  useDocumentTitle(client?.name ?? "Client");

  const back = (
    <Link to="/clients" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
      <ArrowLeft className="size-4" /> All clients
    </Link>
  );

  if (loading && !data) {
    return (
      <>
        {back}
        <Skeleton className="h-48 rounded-3xl" />
      </>
    );
  }

  const notFound = !client && (!error || error.errors?.some((e) => e.extensions?.code === "BAD_USER_INPUT"));
  if (notFound) {
    return (
      <>
        {back}
        <EmptyState
          icon={SearchX}
          title="Client not found"
          action={<ButtonLink to="/clients" variant="secondary">Back to clients</ButtonLink>}
        >
          They may have been deleted, or the link is incorrect.
        </EmptyState>
      </>
    );
  }
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      {back}

      <section className="relative mb-8 animate-rise overflow-hidden rounded-3xl bg-surface p-6 shadow-soft ring-1 ring-line sm:p-8">
        <div className="bg-twill absolute inset-0 [mask-image:linear-gradient(to_left,black,transparent_60%)]" />
        <div className="absolute -top-20 -right-10 size-64 rounded-full bg-twill-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={client.name} size="lg" />
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold tracking-tight">{client.name}</h1>
              <p className="flex items-center gap-1.5 text-muted">
                <Building2 className="size-4" /> {client.company ?? "Independent"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={() => editClient(client)}>
              <Pencil /> Edit
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteOpen(true)}
              aria-label="Delete client"
              title="Delete client"
              className="hover:bg-red-500/10 hover:text-red-600"
            >
              <Trash2 />
            </Button>
          </div>
        </div>

        <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
          <a href={`mailto:${client.email}`} className="flex items-center gap-3 rounded-xl bg-elevated px-4 py-3 text-sm ring-1 ring-line transition hover:ring-line-strong">
            <Mail className="size-4 shrink-0 text-muted" />
            <span className="truncate">{client.email}</span>
          </a>
          <a href={`tel:${client.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-3 rounded-xl bg-elevated px-4 py-3 text-sm ring-1 ring-line transition hover:ring-line-strong">
            <Phone className="size-4 shrink-0 text-muted" />
            {client.phone}
          </a>
          <div className="flex items-center gap-3 rounded-xl bg-elevated px-4 py-3 text-sm ring-1 ring-line">
            <CalendarDays className="size-4 shrink-0 text-muted" />
            Client since {formatDate(client.createdAt)}
          </div>
        </div>
      </section>

      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Projects</h2>
          <p className="text-sm text-muted">{pluralize(client.projectCount, "project")} for {client.name.split(" ")[0]}</p>
        </div>
        <Button variant="secondary" onClick={() => newProject({ clientId: client.id })}>
          <Plus /> New project
        </Button>
      </div>

      {client.projects.length > 0 && (
        <Card className="mb-6 p-5">
          <ProgressThread projects={client.projects} />
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
            {STATUSES.map((status) => (
              <span key={status.value} className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${status.dot}`} />
                {status.label}: {client.projects.filter((p) => p.status === status.value).length}
              </span>
            ))}
          </div>
        </Card>
      )}

      {client.projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          action={
            <Button variant="brand" onClick={() => newProject({ clientId: client.id })}>
              <Plus /> Start a project
            </Button>
          }
        >
          Start the first project for {client.name}.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {client.projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <DeleteClientDialog
        client={deleteOpen ? client : null}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => navigate("/clients", { replace: true })}
      />
    </>
  );
}
