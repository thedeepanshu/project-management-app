import { AlarmClock } from "lucide-react";

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

// Signal bars: Low = 1, Medium = 2, High = 3 filled. The shape alone tells the
// levels apart (colour-blind safe); colour reinforces it.
export function PriorityIcon({ priority, className = "size-3.5" }) {
  const { rank } = PRIORITY[priority];
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      {[5, 9, 13].map((height, index) => (
        <rect
          key={height}
          x={1.5 + index * 5}
          y={14.5 - height}
          width="3"
          height={height}
          rx="1"
          opacity={index < rank ? 1 : 0.22}
        />
      ))}
    </svg>
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
