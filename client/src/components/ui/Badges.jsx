import { AlarmClock, Flag } from "lucide-react";

import { PRIORITY, STATUS } from "../../lib/meta";

const pill = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

export function StatusBadge({ status }) {
  const meta = STATUS[status];
  return (
    <span className={`${pill} ${meta.badge}`}>
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority, withLabel = true }) {
  const meta = PRIORITY[priority];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${meta.color}`} title={`${meta.label} priority`}>
      <Flag className="size-3.5" fill={priority === "HIGH" ? "currentColor" : "none"} />
      {withLabel && meta.label}
    </span>
  );
}

export function OverdueBadge() {
  return (
    <span className={`${pill} bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300`}>
      <AlarmClock className="size-3" />
      Overdue
    </span>
  );
}
