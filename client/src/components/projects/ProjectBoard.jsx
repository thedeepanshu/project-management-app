import { Plus } from "lucide-react";
import { useState } from "react";

import { useWorkspace } from "../../context/workspace";
import { useSetProjectStatus } from "../../hooks/useSetProjectStatus";
import { STATUSES } from "../../lib/meta";
import { ProjectCard } from "./ProjectCard";

// Kanban board: drag a card into another column to change its status.
export function ProjectBoard({ projects }) {
  const setStatus = useSetProjectStatus();
  const { newProject } = useWorkspace();
  const [draggingId, setDraggingId] = useState(null);
  const [overColumn, setOverColumn] = useState(null);

  function handleDrop(event, status) {
    event.preventDefault();
    const project = projects.find((p) => p.id === event.dataTransfer.getData("text/x-project-id"));
    setOverColumn(null);
    setDraggingId(null);
    if (project) setStatus(project, status);
  }

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
      {STATUSES.map((status) => {
        const items = projects.filter((p) => p.status === status.value);
        const isOver = overColumn === status.value;
        return (
          <section
            key={status.value}
            aria-label={status.label}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overColumn !== status.value) setOverColumn(status.value);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setOverColumn(null);
            }}
            onDrop={(e) => handleDrop(e, status.value)}
            className={`flex min-h-72 w-[85%] shrink-0 snap-start flex-col rounded-3xl bg-linear-to-b to-transparent p-3 ring-1 transition sm:w-auto ${
              status.column
            } ${isOver ? "ring-2 ring-twill-500/60 bg-twill-500/5" : "ring-line"}`}
          >
            <header className="mb-3 flex items-center justify-between px-1.5 pt-1">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <span className={`size-2 rounded-full ${status.dot}`} />
                {status.label}
                <span className="rounded-full bg-ink/6 px-2 py-0.5 font-mono text-[11px] text-muted">{items.length}</span>
              </h2>
              <button
                type="button"
                onClick={() => newProject({ status: status.value })}
                className="grid size-7 cursor-pointer place-items-center rounded-lg text-subtle transition hover:bg-ink/6 hover:text-ink"
                aria-label={`New project in ${status.label}`}
              >
                <Plus className="size-4" />
              </button>
            </header>

            <div className="flex flex-1 flex-col gap-3">
              {items.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  showStatus={false}
                  draggable
                  dragging={draggingId === project.id}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/x-project-id", project.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDraggingId(project.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setOverColumn(null);
                  }}
                />
              ))}
              {items.length === 0 && (
                <div
                  className={`grid flex-1 place-items-center rounded-2xl border-2 border-dashed p-6 text-center text-sm transition ${
                    isOver ? "border-twill-500/50 text-twill-600 dark:text-twill-300" : "border-line text-subtle"
                  }`}
                >
                  Drop a project here
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
