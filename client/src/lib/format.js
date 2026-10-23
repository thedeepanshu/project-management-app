const DAY = 86_400_000;

// Due dates are stored as UTC midnight of the chosen calendar day, so they are
// always formatted and compared in UTC to avoid off-by-one shifts.
const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const shortDateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function formatDate(iso, { short = false } = {}) {
  if (!iso) return "";
  return (short ? shortDateFormat : dateFormat).format(new Date(iso));
}

export function formatRelative(iso) {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) return relativeFormat.format(Math.round(diff / 60_000), "minute");
  if (abs < DAY) return relativeFormat.format(Math.round(diff / 3_600_000), "hour");
  if (abs < 30 * DAY) return relativeFormat.format(Math.round(diff / DAY), "day");
  return formatDate(iso);
}

function todayAsUTC() {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Whole days from the user's today until the due date (negative = past). */
export function daysUntil(iso) {
  return Math.round((new Date(iso).getTime() - todayAsUTC()) / DAY);
}

export function isOverdue(project) {
  return Boolean(project.dueDate) && project.status !== "COMPLETED" && daysUntil(project.dueDate) < 0;
}

export function describeDue(project) {
  if (!project.dueDate) return null;
  if (project.status === "COMPLETED") return `Due ${formatDate(project.dueDate, { short: true })}`;
  const days = daysUntil(project.dueDate);
  if (days < -1) return `${-days} days overdue`;
  if (days === -1) return "1 day overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 14) return `Due in ${days} days`;
  return `Due ${formatDate(project.dueDate, { short: true })}`;
}

/** ISO string → value for <input type="date">. */
export function toDateInput(iso) {
  return iso ? iso.slice(0, 10) : "";
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)[0] : "")).toUpperCase() || "?";
}

export function pluralize(count, word, plural = `${word}s`) {
  return `${count} ${count === 1 ? word : plural}`;
}
