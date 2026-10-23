import { CalendarClock, Paperclip } from "lucide-react";
import { Link } from "react-router";

import { describeDue, isOverdue } from "../../lib/format";
import { Avatar } from "../ui/Avatar";
import { OverdueBadge, PriorityBadge, StatusBadge } from "../ui/Badges";

export function DueLabel({ project }) {
  const label = describeDue(project);
  if (!label) return <span className="text-xs text-subtle">No deadline</span>;
  const overdue = isOverdue(project);
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        overdue ? "text-red-600 dark:text-red-400" : "text-muted"
      }`}
    >
      <CalendarClock className="size-3.5" />
      {label}
    </span>
  );
}

export function ProjectCard({ project, showStatus = true, draggable = false, onDragStart, onDragEnd, dragging = false }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group relative flex flex-col rounded-2xl bg-surface p-4 shadow-soft ring-1 ring-line transition duration-200
        hover:-translate-y-0.5 hover:shadow-lift hover:ring-line-strong
        ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${dragging ? "rotate-1 opacity-40" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-[17px] leading-snug font-semibold tracking-tight group-hover:text-twill-600 dark:group-hover:text-twill-300">
          {project.name}
        </h3>
        <PriorityBadge priority={project.priority} withLabel={false} />
      </div>

      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{project.description}</p>

      {(showStatus || isOverdue(project)) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {showStatus && <StatusBadge status={project.status} />}
          {isOverdue(project) && <OverdueBadge />}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        {project.client ? (
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <Avatar name={project.client.name} src={project.client.avatarThumbUrl} size="sm" />
            <span className="truncate text-muted">{project.client.name}</span>
          </span>
        ) : (
          <span className="text-sm text-subtle">No client</span>
        )}
        <span className="flex shrink-0 items-center gap-3">
          {project.attachments.length > 0 && (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium text-muted"
              title={`${project.attachments.length} attachment${project.attachments.length === 1 ? "" : "s"}`}
            >
              <Paperclip className="size-3.5" />
              {project.attachments.length}
            </span>
          )}
          <DueLabel project={project} />
        </span>
      </div>
    </Link>
  );
}
