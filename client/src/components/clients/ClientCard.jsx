import { Mail, Pencil, Phone, Trash2 } from "lucide-react";
import { Link } from "react-router";

import { pluralize } from "../../lib/format";
import { STATUSES } from "../../lib/meta";
import { Avatar } from "../ui/Avatar";

// Thin stacked bar showing how a client's projects split across statuses.
export function ProgressThread({ projects }) {
  if (projects.length === 0) {
    return <div className="h-1.5 rounded-full bg-ink/6" />;
  }
  return (
    <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
      {STATUSES.map((status) => {
        const count = projects.filter((p) => p.status === status.value).length;
        return count ? (
          <div key={status.value} className={status.bar} style={{ flexGrow: count }} title={`${count} ${status.label.toLowerCase()}`} />
        ) : null;
      })}
    </div>
  );
}

export function ClientCard({ client, onEdit, onDelete }) {
  const done = client.projects.filter((p) => p.status === "COMPLETED").length;
  return (
    <article className="group relative flex flex-col rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line transition duration-200 hover:-translate-y-0.5 hover:shadow-lift hover:ring-line-strong">
      <div className="flex items-start gap-3">
        <Avatar name={client.name} src={client.avatarThumbUrl} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[17px] font-semibold tracking-tight">
            {/* Stretched link: the whole card is clickable, action buttons sit above it. */}
            <Link to={`/clients/${client.id}`} className="after:absolute after:inset-0 after:rounded-2xl">
              {client.name}
            </Link>
          </h3>
          <p className="truncate text-sm text-muted">{client.company ?? "Independent"}</p>
        </div>
        <div className="relative z-10 -mr-2 -mt-1 flex opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(client)}
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-subtle transition hover:bg-ink/6 hover:text-ink"
            aria-label={`Edit ${client.name}`}
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(client)}
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-subtle transition hover:bg-red-500/10 hover:text-red-600"
            aria-label={`Delete ${client.name}`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-1.5 text-sm text-muted">
        <p className="flex items-center gap-2 truncate">
          <Mail className="size-3.5 shrink-0" /> {client.email}
        </p>
        <p className="flex items-center gap-2">
          <Phone className="size-3.5 shrink-0" /> {client.phone}
        </p>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-2 flex justify-between text-xs">
          <span className="font-medium">{pluralize(client.projectCount, "project")}</span>
          <span className="text-subtle">{done} done</span>
        </div>
        <ProgressThread projects={client.projects} />
      </div>
    </article>
  );
}
