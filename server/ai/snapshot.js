import Client from "../models/Client.js";
import Project from "../models/Project.js";

const DAY = 86_400_000;

function startOfTodayUTC() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function describeDue(project, today) {
  if (!project.dueDate) return "no due date";
  const date = project.dueDate.toISOString().slice(0, 10);
  const days = Math.round((project.dueDate.getTime() - today) / DAY);
  if (project.status === "Completed") return `due ${date}`;
  if (days < 0) return `due ${date}, OVERDUE by ${-days} day${days === -1 ? "" : "s"}`;
  if (days === 0) return `due ${date} (today)`;
  return `due ${date} (in ${days} day${days === 1 ? "" : "s"})`;
}

function oneLine(text, max) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** A compact, plain-text view of the whole workspace for the assistant. */
export async function buildWorkspaceSnapshot() {
  const [clients, projects] = await Promise.all([
    Client.find().sort({ name: 1 }).lean(),
    Project.find().sort({ createdAt: -1, _id: -1 }).lean(),
  ]);
  const today = startOfTodayUTC();
  const clientById = new Map(clients.map((client) => [client._id.toString(), client]));

  const clientLines = clients.map((client) => {
    const count = projects.filter((p) => p.clientId?.toString() === client._id.toString()).length;
    return `- ${client.name}${client.company ? ` (${client.company})` : ""} | ${client.email} | ${client.phone} | ${count} project${count === 1 ? "" : "s"}`;
  });

  const projectLines = projects.map((project) => {
    const client = clientById.get(project.clientId?.toString());
    const files = project.attachments?.length ?? 0;
    return (
      `- ${project.name} | ${project.status} | ${project.priority ?? "Medium"} priority | ${describeDue(project, today)}` +
      ` | client: ${client ? client.name + (client.company ? ` (${client.company})` : "") : "none"}` +
      (files ? ` | ${files} attachment${files === 1 ? "" : "s"}` : "") +
      ` | ${oneLine(project.description, 220)}`
    );
  });

  return [
    `Clients (${clients.length}):`,
    ...(clientLines.length ? clientLines : ["(none yet)"]),
    "",
    `Projects (${projects.length}), newest first:`,
    ...(projectLines.length ? projectLines : ["(none yet)"]),
  ].join("\n");
}
