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

// Flag that fills up with urgency: Low = outline, Medium = half-tint, High = solid.
const FLAG_FILL_OPACITY = { LOW: 0, MEDIUM: 0.35, HIGH: 1 };

export function PriorityIcon({ priority, className = "size-3.5" }) {
  return (
    <Flag
      className={className}
      fill="currentColor"
      fillOpacity={FLAG_FILL_OPACITY[priority]}
      aria-hidden="true"
    />
  );
}

export function PriorityBadge({ priority, withLabel = true }) {
  const meta = PRIORITY[priority];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.color}`}
      title={`${meta.label} priority`}
      aria-label={withLabel ? undefined : `${meta.label} priority`}
      role={withLabel ? undefined : "img"}
    >
      <PriorityIcon priority={priority} />
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
