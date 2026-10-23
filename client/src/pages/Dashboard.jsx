import { useQuery } from "@apollo/client/react";
import {
  AlarmClock,
  ArrowRight,
  CircleCheckBig,
  FolderKanban,
  Plus,
  Sparkles,
  Timer,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Link } from "react-router";

import { useWorkspace } from "../context/workspace";
import { GET_CLIENTS, GET_PROJECTS, GET_STATS } from "../graphql/documents";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { daysUntil, greeting, isOverdue, pluralize } from "../lib/format";
import { STATUSES } from "../lib/meta";
import { DueLabel } from "../components/projects/ProjectCard";
import { Avatar } from "../components/ui/Avatar";
import { StatusBadge } from "../components/ui/Badges";
import { Button, ButtonLink } from "../components/ui/Button";
import { Card, ErrorState, Skeleton } from "../components/ui/States";

const today = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" });

function CompletionRing({ rate }) {
  const id = useId();
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  // Start empty and animate to the real value after mount.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(rate));
    return () => cancelAnimationFrame(frame);
  }, [rate]);

  return (
    <div className="relative size-40 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-loom-500)" />
            <stop offset="100%" stopColor="var(--color-thread-500)" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-ink/7" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke={`url(#${id})`}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown)}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-4xl font-bold tracking-tight">{Math.round(rate * 100)}%</p>
          <p className="text-xs text-muted">completed</p>
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, caption, tone, delay }) {
  return (
    <Card className="animate-rise p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className={`mb-4 grid size-10 place-items-center rounded-xl ${tone}`}>
        <Icon className="size-5" />
      </div>
      <p className="font-display text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 text-sm font-medium">{label}</p>
      <p className="mt-0.5 text-xs text-subtle">{caption}</p>
    </Card>
  );
}

function SectionTitle({ children, to, linkLabel = "View all" }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-display text-lg font-bold tracking-tight">{children}</h2>
      {to && (
        <Link to={to} className="flex items-center gap-1 text-sm font-medium text-muted transition hover:text-ink">
          {linkLabel} <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function Pipeline({ stats }) {
  const total = stats.totalProjects || 1;
  return (
    <Card className="p-6">
      <SectionTitle to="/projects?view=board" linkLabel="Open board">
        Pipeline
      </SectionTitle>
      <div className="flex h-3.5 overflow-hidden rounded-full bg-ink/6">
        {stats.byStatus.map(({ status, count }) => (
          <div
            key={status}
            className={`${STATUSES.find((s) => s.value === status).bar} transition-all duration-700 first:rounded-l-full last:rounded-r-full`}
            style={{ width: `${(count / total) * 100}%` }}
          />
        ))}
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3">
        {stats.byStatus.map(({ status, count }) => {
          const meta = STATUSES.find((s) => s.value === status);
          return (
            <Link
              key={status}
              to={`/projects?view=grid&status=${status}`}
              className="rounded-xl p-2 -m-2 transition hover:bg-ink/4"
            >
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                <span className={`size-2 rounded-full ${meta.dot}`} />
                {meta.label}
              </dt>
              <dd className="mt-1 font-display text-2xl font-bold">
                {count}
                <span className="ml-1.5 font-sans text-xs font-normal text-subtle">
                  {Math.round((count / total) * 100)}%
                </span>
              </dd>
            </Link>
          );
        })}
      </dl>
    </Card>
  );
}

function ProjectRow({ project, meta }) {
  return (
    <li>
      <Link
        to={`/projects/${project.id}`}
        className="-mx-3 flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-ink/4"
      >
        <Avatar name={project.client?.name ?? "?"} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{project.name}</p>
          <p className="truncate text-xs text-subtle">{project.client?.name}</p>
        </div>
        {meta}
      </Link>
    </li>
  );
}

function Onboarding() {
  const { newClient, newProject } = useWorkspace();
  const steps = [
    { icon: UserPlus, title: "Add a client", text: "Every project is woven to a client.", action: newClient, cta: "Add client" },
    { icon: FolderKanban, title: "Create a project", text: "Set a priority and a deadline.", action: () => newProject(), cta: "New project" },
    { icon: Sparkles, title: "Move it along", text: "Drag cards across the board as work progresses." },
  ];
  return (
    <Card className="p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold tracking-tight">Let’s set up your loom</h2>
      <p className="mt-1 text-sm text-muted">Three steps and your dashboard comes alive.</p>
      <ol className="mt-6 grid gap-4 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-2xl bg-elevated p-5 ring-1 ring-line">
            <div className="flex items-center justify-between">
              <step.icon className="size-5 text-loom-600 dark:text-loom-300" />
              <span className="font-mono text-xs text-subtle">0{index + 1}</span>
            </div>
            <p className="mt-4 font-semibold">{step.title}</p>
            <p className="mt-1 text-sm text-muted">{step.text}</p>
            {step.action && (
              <Button variant="secondary" size="sm" className="mt-4" onClick={step.action}>
                {step.cta}
              </Button>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-56 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

export default function Dashboard() {
  useDocumentTitle("Dashboard");
  const { newProject } = useWorkspace();
  const stats = useQuery(GET_STATS);
  const projects = useQuery(GET_PROJECTS);
  const clients = useQuery(GET_CLIENTS);

  const error = stats.error ?? projects.error ?? clients.error;
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => Promise.all([stats.refetch(), projects.refetch(), clients.refetch()])}
      />
    );
  }
  if (!stats.data || !projects.data || !clients.data) return <DashboardSkeleton />;

  const s = stats.data.stats;
  const allProjects = projects.data.projects;
  const count = (status) => s.byStatus.find((b) => b.status === status)?.count ?? 0;
  const overdue = allProjects.filter(isOverdue);

  const dueSoon = allProjects
    .filter((p) => p.dueDate && p.status !== "COMPLETED" && daysUntil(p.dueDate) <= 14)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);
  const recent = allProjects.slice(0, 5);
  const topClients = [...clients.data.clients].sort((a, b) => b.projectCount - a.projectCount).slice(0, 4);

  const inMotion = count("IN_PROGRESS");
  const summary =
    s.totalProjects === 0
      ? "Your loom is empty — let’s weave your first project."
      : `${pluralize(inMotion, "project")} in motion across ${pluralize(s.totalClients, "client")}` +
        (overdue.length ? `, and ${overdue.length} that need${overdue.length === 1 ? "s" : ""} attention.` : ". Everything is on schedule.");

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative animate-rise overflow-hidden rounded-3xl bg-surface p-6 shadow-soft ring-1 ring-line sm:p-8">
        <div className="bg-weave absolute inset-0 [mask-image:linear-gradient(to_left,black,transparent_70%)]" />
        <div className="absolute -top-24 -right-16 size-72 rounded-full bg-loom-500/20 blur-3xl" />
        <div className="absolute -bottom-28 right-40 size-60 rounded-full bg-thread-500/15 blur-3xl" />

        <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <p className="font-mono text-xs tracking-wider text-subtle uppercase">{today.format(new Date())}</p>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {greeting()}, <span className="text-gradient">maker.</span>
            </h1>
            <p className="mt-3 text-lg text-muted">{summary}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="brand" size="lg" onClick={() => newProject()}>
                <Plus /> New project
              </Button>
              <ButtonLink to="/projects?view=board" variant="secondary" size="lg">
                Open board <ArrowRight />
              </ButtonLink>
            </div>
          </div>
          {s.totalProjects > 0 && <CompletionRing rate={s.completionRate} />}
        </div>
      </section>

      {s.totalProjects === 0 ? (
        <Onboarding />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              icon={FolderKanban}
              label="Total projects"
              value={s.totalProjects}
              caption={`${count("NOT_STARTED")} not started yet`}
              tone="bg-loom-500/12 text-loom-600 dark:text-loom-300"
              delay={60}
            />
            <StatTile
              icon={Timer}
              label="In progress"
              value={inMotion}
              caption="Being woven right now"
              tone="bg-amber-500/12 text-amber-600 dark:text-amber-400"
              delay={120}
            />
            <StatTile
              icon={CircleCheckBig}
              label="Completed"
              value={count("COMPLETED")}
              caption={`${Math.round(s.completionRate * 100)}% of all projects`}
              tone="bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
              delay={180}
            />
            <StatTile
              icon={Users}
              label="Clients"
              value={s.totalClients}
              caption={`${(s.totalProjects / Math.max(s.totalClients, 1)).toFixed(1)} projects per client`}
              tone="bg-thread-500/12 text-thread-600 dark:text-thread-400"
              delay={240}
            />
          </div>

          {overdue.length > 0 && (
            <Link
              to="/projects?sort=due"
              className="flex items-center gap-3 rounded-2xl bg-red-500/8 px-5 py-4 text-sm ring-1 ring-red-500/20 transition hover:bg-red-500/12"
            >
              <AlarmClock className="size-5 shrink-0 text-red-600 dark:text-red-400" />
              <span>
                <strong className="font-semibold">{pluralize(overdue.length, "project")} overdue</strong>
                <span className="text-muted"> — {overdue.map((p) => p.name).join(", ")}</span>
              </span>
              <ArrowRight className="ml-auto size-4 shrink-0 text-muted" />
            </Link>
          )}

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              <Pipeline stats={s} />
              <Card className="p-6">
                <SectionTitle to="/projects?sort=due">Upcoming deadlines</SectionTitle>
                {dueSoon.length ? (
                  <ul>
                    {dueSoon.map((project) => (
                      <ProjectRow key={project.id} project={project} meta={<DueLabel project={project} />} />
                    ))}
                  </ul>
                ) : (
                  <p className="py-6 text-center text-sm text-subtle">Nothing due in the next two weeks. Breathe.</p>
                )}
              </Card>
            </div>

            <div className="space-y-6 lg:col-span-2">
              <Card className="p-6">
                <SectionTitle to="/projects">Recently added</SectionTitle>
                <ul>
                  {recent.map((project) => (
                    <ProjectRow key={project.id} project={project} meta={<StatusBadge status={project.status} />} />
                  ))}
                </ul>
              </Card>
              <Card className="p-6">
                <SectionTitle to="/clients">Top clients</SectionTitle>
                <ul className="space-y-1">
                  {topClients.map((client) => (
                    <li key={client.id}>
                      <Link
                        to={`/clients/${client.id}`}
                        className="-mx-3 flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-ink/4"
                      >
                        <Avatar name={client.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{client.name}</p>
                          <p className="truncate text-xs text-subtle">{client.company ?? client.email}</p>
                        </div>
                        <span className="font-mono text-xs text-muted">{pluralize(client.projectCount, "project")}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
