import Client from "../models/Client.js";
import Project from "../models/Project.js";
import { assertObjectId, badInput, notFound, safe } from "./errors.js";

const NEWEST_FIRST = { createdAt: -1, _id: -1 };

function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseDueDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw badInput("Due date is not a valid date", { dueDate: "Invalid date" });
  }
  return date;
}

// Documents created before timestamps were enabled fall back to the ObjectId's
// embedded creation time.
function createdAtOf(doc) {
  return doc.createdAt ?? doc._id.getTimestamp();
}

async function assertClientExists(clientId) {
  assertObjectId(clientId, "clientId");
  if (!(await Client.exists({ _id: clientId }))) {
    throw badInput("The selected client no longer exists", {
      clientId: "Client not found",
    });
  }
}

async function findOrThrow(Model, id, entity) {
  assertObjectId(id);
  const doc = await Model.findById(id);
  if (!doc) throw notFound(entity);
  return doc;
}

export const resolvers = {
  // Map GraphQL enum names to the strings stored in MongoDB.
  ProjectStatus: {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
  },
  ProjectPriority: {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
  },

  Client: {
    projects: (client, _args, { loaders }) => loaders.projectsByClientId.load(client.id),
    projectCount: async (client, _args, { loaders }) =>
      (await loaders.projectsByClientId.load(client.id)).length,
    createdAt: (client) => createdAtOf(client).toISOString(),
  },

  Project: {
    priority: (project) => project.priority ?? "Medium",
    dueDate: (project) => project.dueDate?.toISOString() ?? null,
    isOverdue: (project) =>
      Boolean(project.dueDate) &&
      project.status !== "Completed" &&
      project.dueDate < startOfTodayUTC(),
    client: (project, _args, { loaders }) =>
      project.clientId ? loaders.clientById.load(project.clientId.toString()) : null,
    createdAt: (project) => createdAtOf(project).toISOString(),
    updatedAt: (project) => (project.updatedAt ?? createdAtOf(project)).toISOString(),
  },

  Query: {
    clients: safe(() => Client.find().sort({ name: 1 })),

    client: safe((_parent, { id }) => {
      assertObjectId(id);
      return Client.findById(id);
    }),

    projects: safe((_parent, { status, clientId }) => {
      const filter = {};
      if (status) filter.status = status;
      if (clientId) {
        assertObjectId(clientId, "clientId");
        filter.clientId = clientId;
      }
      return Project.find(filter).sort(NEWEST_FIRST);
    }),

    project: safe((_parent, { id }) => {
      assertObjectId(id);
      return Project.findById(id);
    }),

    stats: safe(async () => {
      const [totalClients, statusGroups, overdue] = await Promise.all([
        Client.countDocuments(),
        Project.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Project.countDocuments({
          status: { $ne: "Completed" },
          dueDate: { $lt: startOfTodayUTC() },
        }),
      ]);

      const counts = Object.fromEntries(statusGroups.map((g) => [g._id, g.count]));
      const byStatus = ["Not Started", "In Progress", "Completed"].map((status) => ({
        status,
        count: counts[status] ?? 0,
      }));
      const totalProjects = byStatus.reduce((sum, s) => sum + s.count, 0);

      return {
        totalProjects,
        totalClients,
        byStatus,
        overdue,
        completionRate: totalProjects ? (counts["Completed"] ?? 0) / totalProjects : 0,
      };
    }),
  },

  Mutation: {
    addClient: safe((_parent, { input }) => Client.create(input)),

    updateClient: safe(async (_parent, { id, input }) => {
      const client = await findOrThrow(Client, id, "Client");
      client.set(input);
      return client.save();
    }),

    deleteClient: safe(async (_parent, { id }) => {
      const client = await findOrThrow(Client, id, "Client");
      // Remove the client's projects first so no project is ever left orphaned.
      await Project.deleteMany({ clientId: client._id });
      await client.deleteOne();
      return client;
    }),

    addProject: safe(async (_parent, { input }) => {
      await assertClientExists(input.clientId);
      return Project.create({ ...input, dueDate: parseDueDate(input.dueDate) });
    }),

    updateProject: safe(async (_parent, { id, input }) => {
      const project = await findOrThrow(Project, id, "Project");

      if (input.clientId) await assertClientExists(input.clientId);

      const { dueDate, ...rest } = input;
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined && value !== null) project.set(key, value);
      }
      if ("dueDate" in input) project.dueDate = parseDueDate(dueDate) ?? undefined;

      return project.save();
    }),

    deleteProject: safe(async (_parent, { id }) => {
      const project = await findOrThrow(Project, id, "Project");
      await project.deleteOne();
      return project;
    }),
  },
};
