import { useQuery } from "@apollo/client/react";
import { Columns3, FolderKanban, LayoutGrid, Plus, Search, SearchX, X } from "lucide-react";
import { useDeferredValue } from "react";
import { useSearchParams } from "react-router";

import { PageHeader } from "../components/layout/PageHeader";
import { ProjectBoard } from "../components/projects/ProjectBoard";
import { ProjectCard } from "../components/projects/ProjectCard";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Field";
import { Segmented } from "../components/ui/Segmented";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/States";
import { useWorkspace } from "../context/workspace";
import { GET_PROJECTS } from "../graphql/documents";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { pluralize } from "../lib/format";
import { PRIORITIES, PRIORITY, STATUSES } from "../lib/meta";

const SORTS = {
  newest: { label: "Newest first", compare: () => 0 }, // server already returns newest first
  due: {
    label: "Due date",
    compare: (a, b) => (a.dueDate ? new Date(a.dueDate) : Infinity) - (b.dueDate ? new Date(b.dueDate) : Infinity),
  },
  priority: { label: "Priority", compare: (a, b) => PRIORITY[b.priority].rank - PRIORITY[a.priority].rank },
  name: { label: "Name (A–Z)", compare: (a, b) => a.name.localeCompare(b.name) },
};

function matches(project, query) {
  if (!query) return true;
  const haystack = [project.name, project.description, project.client?.name, project.client?.company]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}

export default function Projects() {
  useDocumentTitle("Projects");
  const { newProject } = useWorkspace();
  const { data, loading, error, refetch } = useQuery(GET_PROJECTS);

  // Filters live in the URL so views are shareable and survive refreshes.
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "grid" ? "grid" : "board";
  const status = params.get("status") ?? "ALL";
  const priority = params.get("priority") ?? "ALL";
  const sort = SORTS[params.get("sort")] ? params.get("sort") : "newest";
  const query = params.get("q") ?? "";
  const deferredQuery = useDeferredValue(query);

  function setParam(key, value, fallback) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value || value === fallback) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true }
    );
  }

  const all = data?.projects ?? [];
  const filtered = all
    .filter((p) => matches(p, deferredQuery.trim()))
    .filter((p) => priority === "ALL" || p.priority === priority)
    .filter((p) => view === "board" || status === "ALL" || p.status === status)
    .sort(SORTS[sort].compare);

  const hasFilters = Boolean(query) || priority !== "ALL" || (view === "grid" && status !== "ALL");

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        actions={
          <Button variant="brand" onClick={() => newProject()}>
            <Plus /> New project
          </Button>
        }
      >
        {data ? `${pluralize(all.length, "project")} on the board.` : "Loading your projects…"}
      </PageHeader>

      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search projects</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            value={query}
            onChange={(e) => setParam("q", e.target.value)}
            placeholder="Search by name, description or client…"
            className="h-10 w-full rounded-xl bg-surface pr-3 pl-10 text-sm shadow-soft ring-1 ring-line transition placeholder:text-subtle focus:ring-2 focus:ring-twill-500 focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Filter by priority"
            value={priority}
            onChange={(e) => setParam("priority", e.target.value, "ALL")}
            className="w-40 [&_select]:h-10 [&_select]:text-sm"
          >
            <option value="ALL">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label} priority
              </option>
            ))}
          </Select>
          <Select
            aria-label="Sort projects"
            value={sort}
            onChange={(e) => setParam("sort", e.target.value, "newest")}
            className="w-40 [&_select]:h-10 [&_select]:text-sm"
          >
            {Object.entries(SORTS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          <Segmented
            label="View"
            value={view}
            onChange={(value) => setParam("view", value, "board")}
            options={[
              { value: "board", label: "Board", icon: Columns3, title: "Board view" },
              { value: "grid", label: "Grid", icon: LayoutGrid, title: "Grid view" },
            ]}
          />
        </div>
      </div>

      {view === "grid" && (
        <Segmented
          label="Filter by status"
          size="sm"
          className="mb-6 max-w-full overflow-x-auto"
          value={status}
          onChange={(value) => setParam("status", value, "ALL")}
          options={[{ value: "ALL", label: "All" }, ...STATUSES.map((s) => ({ value: s.value, label: s.label, dot: s.dot }))]}
        />
      )}

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-80 rounded-3xl" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          action={
            <Button variant="brand" onClick={() => newProject()}>
              <Plus /> Create your first project
            </Button>
          }
        >
          Projects you create show up here as cards you can drag across the board.
        </EmptyState>
      ) : filtered.length === 0 && hasFilters ? (
        <EmptyState
          icon={SearchX}
          title="No matching projects"
          action={
            <Button variant="secondary" onClick={() => setParams({ view }, { replace: true })}>
              <X /> Clear filters
            </Button>
          }
        >
          Nothing matches those filters. Try a different search or clear them.
        </EmptyState>
      ) : view === "board" ? (
        <ProjectBoard projects={filtered} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project, index) => (
            <div key={project.id} className="animate-rise" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
              <ProjectCard project={project} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
