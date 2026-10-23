// Display metadata for the GraphQL enums, in their natural order.

export const STATUSES = [
  {
    value: "NOT_STARTED",
    label: "Not started",
    dot: "bg-zinc-400",
    bar: "bg-zinc-400 dark:bg-zinc-500",
    badge: "bg-zinc-500/10 text-zinc-700 ring-zinc-500/20 dark:text-zinc-300",
    column: "from-zinc-500/8",
  },
  {
    value: "IN_PROGRESS",
    label: "In progress",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    badge: "bg-amber-500/12 text-amber-800 ring-amber-500/25 dark:text-amber-300",
    column: "from-amber-500/10",
  },
  {
    value: "COMPLETED",
    label: "Completed",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    badge: "bg-emerald-500/12 text-emerald-800 ring-emerald-500/25 dark:text-emerald-300",
    column: "from-emerald-500/10",
  },
];

export const PRIORITIES = [
  { value: "LOW", label: "Low", rank: 1, color: "text-sky-600 dark:text-sky-400" },
  { value: "MEDIUM", label: "Medium", rank: 2, color: "text-twill-600 dark:text-twill-300" },
  { value: "HIGH", label: "High", rank: 3, color: "text-thread-600 dark:text-thread-400" },
];

const byValue = (list) => Object.fromEntries(list.map((item) => [item.value, item]));

export const STATUS = byValue(STATUSES);
export const PRIORITY = byValue(PRIORITIES);
